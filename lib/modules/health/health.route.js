const express = require("express");
const { HealthController } = require("./health.controller");

const router = express.Router();
router.get("/health", HealthController.health);

module.exports = router;
