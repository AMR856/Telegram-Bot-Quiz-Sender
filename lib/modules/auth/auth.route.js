const express = require("express");
const { signIn } = require("./auth.controller");
const { asyncHandler } = require("../../utils/asyncHandler");

const buildAuthRouter = () => {
  const router = express.Router();

  router.post("/sign-in", asyncHandler(signIn));

  return router;
};

module.exports = {
  buildAuthRouter,
};
