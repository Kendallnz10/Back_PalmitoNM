const axios = require("axios");

const BASE_URL =
  "https://apim.bccr.fi.cr/SDDE/api/Bccr.GE.SDDE.Publico.Indicadores.API";

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJCQ0NSLVNEREUiLCJzdWIiOiJrZW5kYWxsbmFyYW5qbzAwQGdtYWlsLmNvbSIsImF1ZCI6IlNEREUtU2l0aW9FeHRlcm5vIiwiZXhwIjoyNTM0MDIzMDA4MDAsIm5iZiI6MTc3NTY2MTc2NSwiaWF0IjoxNzc1NjYxNzY1LCJqdGkiOiJlMGM4MWZjNy0wNDliLTRjYzEtOTI5Ni1mYjZkNzI3MTg1OWEiLCJlbWFpbCI6ImtlbmRhbGxuYXJhbmpvMDBAZ21haWwuY29tIn0.B2ibrpfjbAMcgc9UcPYPPhG0Fdm4nyrs3uVnjqvEiY4";

function formatearFecha(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

const obtenerTipoCambio = async (req, res) => {
  try {
    let fechaActual = new Date();

    for (let i = 0; i < 5; i++) {
      const fecha = formatearFecha(fechaActual);

      try {
        console.log("🔍 Consultando fecha:", fecha);

        const compraRes = await axios.get(
          `${BASE_URL}/indicadoresEconomicos/317/series?fechaInicio=${fecha}&fechaFin=${fecha}&idioma=ES`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          }
        );

        const ventaRes = await axios.get(
          `${BASE_URL}/indicadoresEconomicos/318/series?fechaInicio=${fecha}&fechaFin=${fecha}&idioma=ES`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          }
        );

        const serieCompra = compraRes.data?.datos?.[0]?.series?.[0];
        const serieVenta  = ventaRes.data?.datos?.[0]?.series?.[0];

        const compra =
          serieCompra?.valorDatoPorPeriodo ||
          serieCompra?.valor ||
          serieCompra?.Valor ||
          serieCompra?.NUM_VALOR;

        const venta =
          serieVenta?.valorDatoPorPeriodo ||
          serieVenta?.valor ||
          serieVenta?.Valor ||
          serieVenta?.NUM_VALOR;

        if (compra && venta) {
          return res.json({
            compra: parseFloat(compra),
            venta: parseFloat(venta),
            fecha: fecha,
          });
        }

      } catch (error) {
        console.error("Error en fecha:", fecha);
        console.error(error.response?.data || error.message);
      }

      fechaActual.setDate(fechaActual.getDate() - 1);
    }

    return res.status(500).json({
      error: "No se pudo obtener tipo de cambio del BCCR",
    });

  } catch (error) {
    console.error("🔥 ERROR GENERAL:", error.message);

    res.status(500).json({
      error: "Error general consultando BCCR",
    });
  }
};

module.exports = { obtenerTipoCambio };