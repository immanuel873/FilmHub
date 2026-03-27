const MIN_WITHDRAW_POINTS = parseInt(process.env.MIN_WITHDRAW_POINTS || "1000", 10);
const POINTS_PER_CURRENCY = parseFloat(process.env.POINTS_PER_CURRENCY || "1");
const CURRENCY_SYMBOL = process.env.CURRENCY_SYMBOL || "K";

module.exports = {
  MIN_WITHDRAW_POINTS,
  POINTS_PER_CURRENCY,
  CURRENCY_SYMBOL
};
