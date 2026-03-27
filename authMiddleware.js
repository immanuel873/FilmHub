const jwt = require("jsonwebtoken");
const { isUserSuspended } = require("../utils/suspension");

const JWT_SECRET = process.env.JWT_SECRET || "filmhub_secret";

module.exports = function (req, res, next) {

  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {

    const decoded = jwt.verify(token.split(" ")[1], JWT_SECRET);

    req.user = decoded;

    if (decoded.role === "admin") {
      return next();
    }

    isUserSuspended(decoded.id, (sErr, suspended) => {
      if (sErr) {
        console.error("Suspension check failed:", sErr.message || sErr);
        return next();
      }
      if (suspended) {
        return res.status(403).json({ message: "Account suspended" });
      }
      next();
    });

  } catch (err) {

    return res.status(401).json({ message: "Invalid token" });

  }

};
