const express = require("express");
const router = express.Router();

const {
  obtenerTipoCambio,
} = require("../controllers/bccrController");

router.get("/", obtenerTipoCambio);

module.exports = router;