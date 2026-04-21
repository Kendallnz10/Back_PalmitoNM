const { palmito, tse } = require('../config/db'); 
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { registrarBitacora } = require('../utils/auditoria'); 
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios'); 

const client = new OAuth2Client("626253654724-68sicbt3a4vgmlb7klmfi0tb195ik2bt.apps.googleusercontent.com");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kendallnaranjo00@gmail.com',
        pass: 'cfripqvdatlquhno'
    }
});

const validarPasswordHU1 = (pass) => {
    const tieneVocales = /[aeiouAEIOU]/.test(pass);
    const tieneNumero = /\d/.test(pass);
    const tieneSimbolo = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const largoOk = pass.length >= 10;
    return largoOk && !tieneVocales && tieneNumero && tieneSimbolo;
};

const enviarCodigoVerificacion = async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ mensaje: "El correo es requerido" });
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 10 * 60000); 
        await palmito.query(`
            INSERT INTO verificaciones_email (correo, codigo, fecha_expiracion) 
            VALUES ($1, $2, $3)
            ON CONFLICT (correo) DO UPDATE SET codigo = $2, fecha_expiracion = $3
        `, [correo, codigo, expiracion]);
        await transporter.sendMail({
            from: '"Palmito NM 🌴" <kendallnaranjo00@gmail.com>',
            to: correo,
            subject: 'Verificación de Seguridad - Palmito NM',
            html: `<div style="font-family: Arial; text-align: center;"><h1>PALMITO NM</h1><h2>Código: ${codigo}</h2></div>`
        });
        res.json({ success: true, mensaje: "Código enviado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const validarCodigo = async (req, res) => {
    try {
        const { correo, codigo } = req.body;
        const result = await palmito.query(`SELECT * FROM verificaciones_email WHERE correo = $1 AND codigo = $2 AND fecha_expiracion > NOW()`, [correo, codigo]);
        res.json({ success: result.rows.length > 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const validarCedulaTSE = async (req, res) => {
    try {
        const { cedula } = req.body;
        const result = await tse.query(`SELECT nombre, primer_apellido, segundo_apellido FROM padron_nacional WHERE TRIM(cedula) = $1`, [cedula.replace(/-/g, '').trim()]);
        if (result.rows.length > 0) {
            res.json({ success: true, datos: { nombre: result.rows[0].nombre, apellidos: `${result.rows[0].primer_apellido} ${result.rows[0].segundo_apellido}`.trim() } });
        } else { res.status(404).json({ success: false }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const loginUsuario = async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;
        
        const result = await palmito.query(
            'SELECT * FROM usuarios WHERE usuario = $1', 
            [usuario.trim().toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                mensaje: 'El usuario no existe' 
            });
        }

        const user = result.rows[0];

        // 1. Verificar si ya está bloqueado antes de intentar nada
        if (user.intentos_fallidos >= 3) {
            return res.status(403).json({ 
                success: false, 
                mensaje: 'CUENTA BLOQUEADA: Has alcanzado el límite de 3/3 intentos.' 
            });
        }

        const match = await bcrypt.compare(contrasena, user.contrasena || user.password);

        if (!match) {
            // 2. Calcular el nuevo conteo
            const nuevosIntentos = (user.intentos_fallidos || 0) + 1;
            
            // 3. Actualizar la base de datos
            await palmito.query(
                'UPDATE usuarios SET intentos_fallidos = $1 WHERE id_usuario = $2', 
                [nuevosIntentos, user.id_usuario]
            );

            // 4. Si el nuevo intento llega a 3, mandamos mensaje de bloqueo
            if (nuevosIntentos >= 3) {
                return res.status(403).json({ 
                    success: false, 
                    mensaje: 'CONTRASENA INCORRECTA: Intentos fallidos 3/3. Cuenta bloqueada.' 
                });
            }

            // 5. Mensaje dinámico de intentos (1/3 o 2/3)
            return res.status(401).json({ 
                success: false, 
                mensaje: `CONTRASENA INCORRECTA: Intentos fallidos ${nuevosIntentos}/3` 
            });
        }

        // LOGIN EXITOSO: Reseteamos intentos_fallidos a 0
        await palmito.query(
            'UPDATE usuarios SET intentos_fallidos = 0 WHERE id_usuario = $1', 
            [user.id_usuario]
        );

        res.json({ 
            success: true, 
            requiereMFA: user.mfa_activado, 
            id_usuario: user.id_usuario, 
            usuario: user 
        });

    } catch (err) { 
        console.error("Error en loginUsuario:", err);
        res.status(500).json({ mensaje: 'Error interno del servidor' }); 
    }
};

const loginGoogle = async (req, res) => {
    const { correo } = req.body; 
    try {
        const usuario = await palmito.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        if (usuario.rows.length > 0) {
            const user = usuario.rows[0];
            res.json({ success: true, nuevoUsuario: false, requiereMFA: user.mfa_activado, id_usuario: user.id_usuario, usuario: user });
        } else { res.json({ success: true, nuevoUsuario: true, datosPrecargados: { correo } }); }
    } catch (error) { res.status(500).json({ mensaje: "Error" }); }
};

// --- FUNCIÓN FACEBOOK ---
const loginConFacebook = async (req, res) => {
    const { token } = req.body;
    try {
        const fbRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name&access_token=${token}`);
        const { email, first_name, last_name } = fbRes.data;
        const usuario = await palmito.query('SELECT * FROM usuarios WHERE correo = $1', [email]);
        if (usuario.rows.length > 0) {
            const user = usuario.rows[0];
            res.json({ success: true, nuevoUsuario: false, requiereMFA: user.mfa_activado, id_usuario: user.id_usuario, usuario: user });
        } else {
            res.json({ success: true, nuevoUsuario: true, datosPrecargados: { correo: email, nombre: first_name, apellido: last_name } });
        }
    } catch (error) { res.status(500).json({ mensaje: "Error FB" }); }
};

const registrarUsuario = async (req, res) => {
    try {
        const { usuario, nombre, apellido, correo, contrasena, telefono, direccion } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(contrasena, salt);
        const result = await palmito.query(`INSERT INTO usuarios (usuario, nombre, apellido, correo, contrasena, telefono, direccion, fecha_registro, estado, mfa_activado) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true, false) RETURNING id_usuario`, [usuario.toUpperCase(), nombre, apellido, correo, hash, telefono, direccion]);
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const activarMFA = async (req, res) => {
    try {
        const { id_usuario, correo } = req.body;
        const secret = speakeasy.generateSecret({ length: 10, name: `Palmito NM:${correo}` });
        const qrImage = await QRCode.toDataURL(secret.otpauth_url);
        await palmito.query('UPDATE usuarios SET llave_autenticacion = $1 WHERE id_usuario = $2', [secret.base32.toUpperCase(), id_usuario]);
        res.json({ success: true, qrCode: qrImage, secret: secret.base32.toUpperCase() });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const verificarCodigoMFA = async (req, res) => {
    try {
        const { idUsuario, codigo } = req.body;
        const result = await palmito.query('SELECT * FROM usuarios WHERE id_usuario = $1', [idUsuario]);
        const user = result.rows[0];
        const verificado = speakeasy.totp.verify({ secret: user.llave_autenticacion, encoding: 'base32', token: codigo, window: 2 });
        if (verificado) res.json({ success: true, usuario: user });
        else res.status(400).json({ success: false });
    } catch (error) { res.status(500).json({ mensaje: "Error" }); }
};

const guardarPreguntasSeguridad = async (req, res) => {
    const { idUsuario, p1, r1, p2, r2 } = req.body;
    try {
        await palmito.query('INSERT INTO usuarios_preguntas_seguridad (id_usuario, pregunta, respuesta) VALUES ($1, $2, $3), ($1, $4, $5)', [idUsuario, p1, r1, p2, r2]);
        await palmito.query('UPDATE usuarios SET preguntas_configuradas = true WHERE id_usuario = $1', [idUsuario]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const obtenerPreguntasPorCorreo = async (req, res) => {
    try {
        const { correo } = req.body;
        const result = await palmito.query(
            `SELECT u.id_usuario, u.usuario, p.pregunta 
             FROM usuarios u 
             JOIN usuarios_preguntas_seguridad p ON u.id_usuario = p.id_usuario 
             WHERE u.correo = $1`, 
            [correo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, mensaje: "Correo no encontrado" });
        }

        // CORRECCIÓN AQUÍ: Agregamos 'usuario' al objeto que se envía a Flutter
        res.json({ 
            success: true, 
            body: { 
                usuario: { 
                    id_usuario: result.rows[0].id_usuario,
                    usuario: result.rows[0].usuario // <--- ESTO ES LO QUE FALTABA
                }, 
                preguntas: result.rows.map(r => r.pregunta) 
            } 
        });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

const verificarRespuestasSeguridad = async (req, res) => {
    const { idUsuario, r1, r2 } = req.body;
    try {
        const result = await palmito.query('SELECT respuesta FROM usuarios_preguntas_seguridad WHERE id_usuario = $1', [idUsuario]);
        const respuestasBD = result.rows.map(r => r.respuesta.toLowerCase().trim());
        if (respuestasBD.includes(r1.toLowerCase().trim()) && respuestasBD.includes(r2.toLowerCase().trim())) res.json({ success: true });
        else res.status(401).json({ success: false });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const restablecerPasswordPostValidacion = async (req, res) => {
    const { idUsuario, nuevaPass } = req.body;
    try {
        // 1. Obtener las últimas 10 contraseñas del historial para ese usuario
        const historial = await palmito.query(
            'SELECT password FROM historial_passwords WHERE id_usuario = $1 ORDER BY fecha_cambio DESC LIMIT 10',
            [idUsuario]
        );

        // 2. Comparar la nueva clave con el historial usando bcrypt.compare
        for (let row of historial.rows) {
            const esIgual = await bcrypt.compare(nuevaPass, row.password);
            if (esIgual) {
                return res.status(400).json({ 
                    success: false, 
                    mensaje: "La nueva contraseña no puede ser igual a ninguna de las últimas 10 utilizadas." 
                });
            }
        }

        // 3. Si no es repetida, hasheamos y actualizamos
        const hash = await bcrypt.hash(nuevaPass, 10);
        
        // Actualizar tabla usuarios (y desbloquear cuenta reseteando intentos si fuera necesario)
        await palmito.query(
            'UPDATE usuarios SET contrasena = $1, estado = true, intentos_fallidos = 0 WHERE id_usuario = $2', 
            [hash, idUsuario]
        );

        // 4. IMPORTANTE: Guardar la nueva contraseña en el historial
        await palmito.query(
            'INSERT INTO historial_passwords (id_usuario, password, fecha_cambio) VALUES ($1, $2, NOW())',
            [idUsuario, hash]
        );

        res.json({ success: true });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

const restablecerCredenciales = async (req, res) => {
    const { idUsuario, nuevoUser, nuevaPass } = req.body;
    try {
        // Repetimos la lógica de validación de historial
        const historial = await palmito.query(
            'SELECT password FROM historial_passwords WHERE id_usuario = $1 ORDER BY fecha_cambio DESC LIMIT 10',
            [idUsuario]
        );

        for (let row of historial.rows) {
            const esIgual = await bcrypt.compare(nuevaPass, row.password);
            if (esIgual) {
                return res.status(400).json({ 
                    success: false, 
                    mensaje: "La nueva contraseña no puede ser igual a las últimas 10 registradas." 
                });
            }
        }

        const hash = await bcrypt.hash(nuevaPass, 10);
        
        // Actualizar usuario y contraseña
        await palmito.query(
            'UPDATE usuarios SET usuario = $1, contrasena = $2, intentos_fallidos = 0 WHERE id_usuario = $3', 
            [nuevoUser.toUpperCase(), hash, idUsuario]
        );

        // Guardar en historial
        await palmito.query(
            'INSERT INTO historial_passwords (id_usuario, password, fecha_cambio) VALUES ($1, $2, NOW())',
            [idUsuario, hash]
        );

        res.json({ success: true });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};
const actualizarUsuario = async (req, res) => {
    try {
        const { nombre, apellido, telefono, direccion, usuario } = req.body; 
        await palmito.query('UPDATE usuarios SET nombre = $1, apellido = $2, telefono = $3, direccion = $4, usuario = $5 WHERE id_usuario = $6', [nombre, apellido, telefono, direccion, usuario.toUpperCase(), req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const obtenerUsuarios = async (req, res) => {
    try {
        const result = await palmito.query('SELECT * FROM usuarios');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
};

module.exports = {
    enviarCodigoVerificacion, validarCodigo, registrarUsuario, loginUsuario, loginGoogle, loginConFacebook,
    activarMFA, verificarCodigoMFA, guardarPreguntasSeguridad, obtenerPreguntasPorCorreo, 
    verificarRespuestasSeguridad, restablecerPasswordPostValidacion, restablecerCredenciales,
    actualizarUsuario, obtenerUsuarios, validarCedulaTSE, validarPasswordHU1
};