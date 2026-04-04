const rateLimit = require("express-rate-limit");

const buildGlobalRateLimiter = () =>
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests",
      details: "Try again in a few minutes.",
    },
  });

const buildAuthRateLimiter = () =>
  rateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many auth attempts",
      details: "Try signing in again later.",
    },
  });

module.exports = {
  buildGlobalRateLimiter,
  buildAuthRateLimiter,
};
