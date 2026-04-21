require("dotenv").config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const BASE = process.env.PAYPAL_BASE_URL;

const getAuth = () => {
  return Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
};

module.exports = {
  BASE,
  getAuth,
};