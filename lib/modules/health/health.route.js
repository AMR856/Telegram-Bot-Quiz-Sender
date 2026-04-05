const express = require("express");
const { HealthController } = require("./health.controller");

const router = express.Router();
router.get("/", HealthController.health);

module.exports = { router };
