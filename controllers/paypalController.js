const axios = require("axios");
const { BASE, getAuth } = require("../config/paypalConfig");

exports.createOrder = async (req, res) => {
  try {
    const { total } = req.body;

    if (!total) {
      return res.status(400).json({ error: "Total requerido" });
    }

    const response = await axios.post(
      `${BASE}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: parseFloat(total).toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "Palmito NM",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW", 
            return_url: "https://backend-palmitonm.onrender.com/paypal/success-callback",
            cancel_url: "https://backend-palmitonm.onrender.com/paypal/cancel-callback"
        }
      },
      {
        headers: {
          Authorization: `Basic ${getAuth()}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error createOrder:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error creando orden",
      detalle: error.response?.data || error.message,
    });
  }
};

exports.captureOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: "orderID requerido" });
    }

    const response = await axios.post(
      `${BASE}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Basic ${getAuth()}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error captureOrder:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error capturando pago",
      detalle: error.response?.data || error.message,
    });
  }
};