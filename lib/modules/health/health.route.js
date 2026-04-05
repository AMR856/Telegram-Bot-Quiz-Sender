const express = require("express");
const { HealthController } = require("./health.controller");

const healthRouter = express.Router();
healthRouter.get("/", HealthController.health);

module.exports = { healthRouter };
