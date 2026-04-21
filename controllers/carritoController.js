const { palmito } = require('../config/db'); 
const { registrarBitacora } = require('../utils/auditoria');

const obtenerCarrito = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const result = await palmito.query(`
            SELECT 
                p.id_producto, 
                p.nombre_producto AS nombre, 
                p.precio, 
                p.imagen,
                dc.cantidad,
                dc.precio_unitario,
                dc.subtotal
            FROM detalle_carrito dc
            JOIN carrito c ON dc.id_carrito = c.id_carrito
            JOIN producto p ON dc.id_producto = p.id_producto
            WHERE c.id_usuario = $1
        `, [id_usuario]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error en obtenerCarrito:", err.message);
        res.status(500).json({ error: "Error al cargar los productos del carrito" });
    }
};

// 2. AGREGAR AL CARRITO
const agregarAlCarrito = async (req, res) => {
    const { id_usuario, id_producto, cantidad, precio_unitario } = req.body;
    try {
        let carritoRes = await palmito.query('SELECT id_carrito FROM carrito WHERE id_usuario = $1', [id_usuario]);
        let id_carrito;

        if (carritoRes.rows.length === 0) {
            const nuevoCarrito = await palmito.query(
                'INSERT INTO carrito (id_usuario, fecha_creacion) VALUES ($1, NOW()) RETURNING id_carrito',
                [id_usuario]
            );
            id_carrito = nuevoCarrito.rows[0].id_carrito;
        } else {
            id_carrito = carritoRes.rows[0].id_carrito;
        }

        const queryDetalle = `
            INSERT INTO detalle_carrito (id_carrito, id_producto, cantidad, precio_unitario)
            VALUES ($1::int, $2::int, $3::int, $4::numeric)
            ON CONFLICT (id_carrito, id_producto) 
            DO UPDATE SET 
                cantidad = detalle_carrito.cantidad + EXCLUDED.cantidad;
        `;

        await palmito.query(queryDetalle, [id_carrito, id_producto, cantidad, precio_unitario]);
        
        // Bitácora ajustada a tu tabla Bitacora_Movimientos
        registrarBitacora(id_usuario, 'AGREGAR_CARRITO', `Producto ID: ${id_producto}`).catch(console.error);
        
        res.status(200).send("Producto agregado con éxito");
    } catch (error) {
        console.error("Error en agregarAlCarrito:", error.message);
        res.status(500).send(error.message);
    }
};

// 3. ACTUALIZAR CANTIDAD
const actualizarCantidad = async (req, res) => {
    const { id_usuario, id_producto, cantidad } = req.body;
    try {
        await palmito.query(`
            UPDATE detalle_carrito
            SET cantidad = $1::int
            WHERE id_producto = $2::int 
            AND id_carrito IN (SELECT id_carrito FROM carrito WHERE id_usuario = $3::int)
        `, [cantidad, id_producto, id_usuario]);

        registrarBitacora(id_usuario, 'MODIFICAR_CARRITO', `Prod ID: ${id_producto}`).catch(console.error);
        res.json({ mensaje: "Cantidad actualizada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. ELIMINAR PRODUCTO
const eliminarProducto = async (req, res) => {
    const { id_usuario, id_producto } = req.params;
    try {
        const carritoInfo = await palmito.query('SELECT id_carrito FROM carrito WHERE id_usuario = $1', [id_usuario]);
        if (carritoInfo.rows.length > 0) {
            const id_carrito = carritoInfo.rows[0].id_carrito;
            await palmito.query('DELETE FROM detalle_carrito WHERE id_carrito = $1 AND id_producto = $2', [id_carrito, id_producto]);
            registrarBitacora(id_usuario, 'ELIMINAR_CARRITO', `Prod ID: ${id_producto}`).catch(console.error);

            const conteo = await palmito.query('SELECT COUNT(*) as total FROM detalle_carrito WHERE id_carrito = $1', [id_carrito]);
            if (parseInt(conteo.rows[0].total) === 0) {
                await palmito.query('DELETE FROM carrito WHERE id_carrito = $1', [id_carrito]);
            }
        }
        res.json({ mensaje: "Producto eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. PROCESAR PAGO
const procesarPago = async (req, res) => {
    const { id_usuario } = req.body;
    const client = await palmito.connect();

    try {
        await client.query('BEGIN'); 

        // 1. Obtener carrito uniendo con la tabla 'productos' y sus columnas correctas
        const carritoData = await client.query(`
            SELECT 
                dc.id_producto, 
                dc.cantidad, 
                dc.precio_unitario, 
                p.stock, 
                p.nombre
            FROM detalle_carrito dc
            JOIN productos p ON dc.id_producto = p.id
            JOIN carrito c ON dc.id_carrito = c.id_carrito
            WHERE c.id_usuario = $1
        `, [id_usuario]);

        if (carritoData.rows.length === 0) throw new Error("Carrito vacío");

        // 2. Validación de Stock (Permite quedar en 0)
        for (const item of carritoData.rows) {
            const stockActual = Number(item.stock);
            const cantidadPedida = Number(item.cantidad);

            console.log(`Validando ${item.nombre}: Stock actual ${stockActual}, Pedido ${cantidadPedida}`);

            if (cantidadPedida > stockActual) {
                throw new Error(`Stock insuficiente para ${item.nombre}. Quedan ${stockActual} unidades.`);
            }
        }

        // 3. Calcular Total
        let totalFinal = 0;
        carritoData.rows.forEach(item => {
            totalFinal += (Number(item.cantidad) * Number(item.precio_unitario));
        });

        // 4. Registrar Pedido (Cabecera)
        const resPedido = await client.query(`
            INSERT INTO pedido (id_usuario, fecha_pedido, estado, total) 
            VALUES ($1, NOW(), 'Completado', $2)
            RETURNING id_pedido
        `, [id_usuario, totalFinal]);
        
        const { id_pedido } = resPedido.rows[0];

        // 5. Registrar Detalle y Rebajar Stock
        for (const item of carritoData.rows) {
            // Detalle
            await client.query(`
                INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario) 
                VALUES ($1, $2, $3, $4)
            `, [id_pedido, item.id_producto, item.cantidad, item.precio_unitario]);

            // Rebajo en tabla 'productos' usando columna 'id'
            const resUpdate = await client.query(`
                UPDATE productos 
                SET stock = stock - $1 
                WHERE id = $2 AND stock >= $1
            `, [item.cantidad, item.id_producto]);

            if (resUpdate.rowCount === 0) {
                throw new Error(`Error al actualizar stock de ${item.nombre}.`);
            }
        }

        // 6. Limpiar Carrito
        await client.query(`
            DELETE FROM detalle_carrito 
            WHERE id_carrito IN (SELECT id_carrito FROM carrito WHERE id_usuario = $1)
        `, [id_usuario]);

        await client.query('COMMIT'); 

        registrarBitacora(id_usuario, 'VENTA_COMPLETADA', `Pedido #${id_pedido}`).catch(console.error);

        res.json({ success: true, mensaje: "Venta registrada con éxito", id_pedido });

    } catch (err) {
        if (client) await client.query('ROLLBACK'); 
        console.error("ERROR CRÍTICO EN PAGO:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = { agregarAlCarrito, obtenerCarrito, actualizarCantidad, eliminarProducto, procesarPago };