const express = require("express");
const { AuthController } = require("./auth.controller");
const { asyncHandler } = require("../../utils/asyncHandler");

const router = express.Router();

router.post("/sign-in", asyncHandler(AuthController.signIn));

module.exports = router;
