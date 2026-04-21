const { banco } = require('../config/db');

const procesarPagoTarjeta = async (req, res) => {
    const { numero, cvv, vencimiento, monto } = req.body;
    
    const numAnonimo = `************${numero.slice(-4)}`; 
    const authCode = Math.random().toString(36).substring(7).toUpperCase();

    try {
        await banco.query('BEGIN');

        // DEBITO
        const debito = await banco.query(
            'SELECT * FROM cuentas_debito WHERE numero_tarjeta = $1 AND cvv = $2 AND fecha_vencimiento = $3',
            [numero, cvv, vencimiento]
        );

        if (debito.rows.length > 0) {
            if (parseFloat(debito.rows[0].saldo_disponible) >= monto) {
                await banco.query('UPDATE cuentas_debito SET saldo_disponible = saldo_disponible - $1 WHERE id_cuenta_deb = $2', 
                    [monto, debito.rows[0].id_cuenta_deb]);
                
                await banco.query(
                    `INSERT INTO transacciones_bancarias (tipo_metodo, monto, num_tarjeta_anonimo, codigo_autorizacion, fecha, descripcion) 
                     VALUES ($1, $2, $3, $4, NOW(), $5)`,
                    ['TARJETA_DEBITO', monto, numAnonimo, authCode, 'Compra en Tienda Palmito NM']
                );

                await banco.query('COMMIT');
                return res.json({ success: true, mensaje: "Pago Débito Aprobado", comprobante: authCode });
            }
            return res.status(400).json({ success: false, mensaje: "Saldo insuficiente" });
        }

        // 2. CREDITO
        const credito = await banco.query(
            'SELECT * FROM tarjetas_credito WHERE numero_tarjeta = $1 AND cvv = $2 AND fecha_vencimiento = $3',
            [numero, cvv, vencimiento]
        );

        if (credito.rows.length > 0) {
            const disponible = parseFloat(credito.rows[0].limite_credito) - parseFloat(credito.rows[0].saldo_utilizado);
            if (disponible >= monto) {
                await banco.query('UPDATE tarjetas_credito SET saldo_utilizado = saldo_utilizado + $1 WHERE id_tarjeta_cred = $2', 
                    [monto, credito.rows[0].id_tarjeta_cred]);

                await banco.query(
                    `INSERT INTO transacciones_bancarias (tipo_metodo, monto, num_tarjeta_anonimo, codigo_autorizacion, fecha, descripcion) 
                     VALUES ($1, $2, $3, $4, NOW(), $5)`,
                    ['TARJETA_CREDITO', monto, numAnonimo, authCode, 'Compra en Tienda Palmito NM']
                );

                await banco.query('COMMIT');
                return res.json({ success: true, mensaje: "Pago Crédito Aprobado", comprobante: authCode });
            }
            return res.status(400).json({ success: false, mensaje: "Límite excedido" });
        }

        await banco.query('ROLLBACK');
        res.status(404).json({ success: false, mensaje: "Tarjeta inválida" });
    } catch (error) {
        await banco.query('ROLLBACK');
        console.error("Error en DB:", error.message);
        res.status(500).json({ success: false, mensaje: "Error interno del banco" });
    }
};

const procesarSinpeMovil = async (req, res) => {
    const { tel_origen, tel_destino, monto, descripcion } = req.body;
    const authCode = 'S-' + Math.random().toString(36).substring(7).toUpperCase();

    try {
        await banco.query('BEGIN');

        // Validar origen y saldo
        const origen = await banco.query(
            `SELECT d.id_cuenta_deb, d.saldo_disponible FROM clientes_banco c 
             JOIN cuentas_debito d ON c.id_cliente = d.id_cliente WHERE c.telefono_sinpe = $1`, [tel_origen]
        );

        if (origen.rows.length === 0 || parseFloat(origen.rows[0].saldo_disponible) < monto) {
            await banco.query('ROLLBACK');
            return res.status(400).json({ success: false, mensaje: "Saldo insuficiente o número no afiliado" });
        }

        await banco.query('UPDATE cuentas_debito SET saldo_disponible = saldo_disponible - $1 WHERE id_cuenta_deb = $2', 
            [monto, origen.rows[0].id_cuenta_deb]);

        await banco.query(
            `UPDATE cuentas_debito SET saldo_disponible = saldo_disponible + $1 
             WHERE id_cliente = (SELECT id_cliente FROM clientes_banco WHERE telefono_sinpe = $2)`, 
            [monto, tel_destino]
        );

        // REGISTRAR
        await banco.query(
            `INSERT INTO transacciones_bancarias (tipo_metodo, monto, telefono_origen, telefono_destino, descripcion, codigo_autorizacion, fecha) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            ['SINPE_MOVIL', monto, tel_origen, tel_destino, descripcion, authCode]
        );

        await banco.query('COMMIT');
        res.json({ success: true, mensaje: "SINPE Exitoso", comprobante: authCode });
        
    } catch (error) {
        await banco.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error en el servicio SINPE" });
    }
};

const procesarPagoPaypal = async (req, res) => {
    const { id_usuario, monto, orderID, descripcion } = req.body;
    
    try {
        await banco.query('BEGIN');

        const telTienda = '84214439';
        await banco.query(
            `UPDATE cuentas_debito SET saldo_disponible = saldo_disponible + $1 
             WHERE id_cliente = (SELECT id_cliente FROM clientes_banco WHERE telefono_sinpe = $2)`, 
            [monto, telTienda]
        );

        await banco.query(
            `INSERT INTO transacciones_bancarias (tipo_metodo, monto, descripcion, codigo_autorizacion, fecha) 
             VALUES ($1, $2, $3, $4, NOW())`,
            ['PAYPAL', monto, descripcion || 'Compra vía PayPal - Palmito NM', orderID]
        );

        await banco.query('COMMIT');
        res.json({ 
            success: true, 
            mensaje: "Pago PayPal registrado exitosamente", 
            comprobante: orderID 
        });

    } catch (error) {
        await banco.query('ROLLBACK');
        console.error("Error en PayPal Backend:", error.message);
        res.status(500).json({ success: false, mensaje: "Error al registrar el pago de PayPal" });
    }
};

const consultarNombrePorTelefono = async (req, res) => {
    const { telefono } = req.params;
    try {
        const resultado = await banco.query(
            'SELECT nombre_completo FROM clientes_banco WHERE telefono_sinpe = $1', [telefono]
        );
        if (resultado.rows.length > 0) {
            return res.json({ success: true, nombre: resultado.rows[0].nombre_completo });
        }
        res.status(404).json({ success: false, mensaje: "No encontrado" });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: error.message });
    }
};

module.exports = { 
    consultarNombrePorTelefono, 
    procesarPagoTarjeta, 
    procesarSinpeMovil, 
    procesarPagoPaypal 
};