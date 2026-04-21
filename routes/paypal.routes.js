const express = require("express");
const router = express.Router();
const paypalController = require("../controllers/paypalController");

// Rutas para la lógica de API
router.post("/create-order", paypalController.createOrder);
router.post("/capture-order", paypalController.captureOrder);

/**
 * SUCCESS CALLBACK
 * Esta ruta es llamada por PayPal cuando el usuario aprueba el pago.
 * Redirige automáticamente a la App usando Deep Linking.
 */
router.get("/success-callback", (req, res) => {
    const { token, PayerID } = req.query;

    console.log(">>> Pago Autorizado por PayPal");
    console.log("Token:", token);
    console.log("PayerID:", PayerID);

    // Enviamos el HTML con el script de redirección inmediata
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Autorizado</title>
            <script>
                // Redirección inmediata al esquema configurado en el AndroidManifest.xml
                // Pasamos el token por si lo necesitas recuperar vía Deep Link
                window.location.href = "palmitonm://success?token=${token}&PayerID=${PayerID}";
                
                // Intento de cierre de pestaña para navegadores que lo permitan
                setTimeout(() => {
                    window.close();
                }, 3000);
            </script>
            <style>
                body { 
                    background-color: #F2E8D5; 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    text-align: center; 
                    padding-top: 100px;
                    color: #3B4D28;
                }
                .container {
                    padding: 20px;
                }
                .loader {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #7D9452;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2 style="font-weight: bold;">¡Pago Autorizado con éxito!</h2>
                <p>Abriendo Palmito NM para confirmar tu pedido...</p>
                <div class="loader"></div>
                <p style="font-size: 0.9em; color: #7D9452;">Si la aplicación no se abre automáticamente, puedes volver a ella manualmente.</p>
            </div>
        </body>
        </html>
    `);
});

/**
 * CANCEL CALLBACK
 * Esta ruta es llamada si el usuario cancela el proceso en PayPal.
 */
router.get("/cancel-callback", (req, res) => {
    console.log(">>> Pago Cancelado por el usuario");
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background-color: #ffffff; font-family: sans-serif; text-align: center; padding-top: 100px; }
                h1 { color: #9E2A2B; }
                button { background-color: #3B4D28; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>Pago Cancelado</h1>
            <p>Has cancelado el proceso de pago en PayPal.</p>
            <br>
            <button onclick="window.location.href='palmitonm://cancel'">VOLVER A LA APP</button>
        </body>
        </html>
    `);
});

module.exports = router;