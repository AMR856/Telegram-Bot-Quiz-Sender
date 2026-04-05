const express = require("express");
const { AuthController } = require("./auth.controller");
const { validate } = require("../../middlewares/validate");
const AuthValidationSchema = require("./auth.validation");

const router = express.Router();

router.post(
  "/sign-in",
  validate({ body: AuthValidationSchema.signIn }),
  AuthController.signIn,
);

module.exports = { router };
