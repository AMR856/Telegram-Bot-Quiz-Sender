const express = require("express");
const { health } = require("./health.controller");
const { asyncHandler } = require("../../utils/asyncHandler");

const buildHealthRouter = () => {
  const router = express.Router();

  router.get("/health", asyncHandler(health));

  return router;
};

module.exports = {
  buildHealthRouter,
};
