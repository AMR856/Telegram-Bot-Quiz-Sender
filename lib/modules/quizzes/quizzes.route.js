const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { QuizzesValidationSchema } = require("./quizzes.validation");
const { QuizzesController } = require("./quizzes.controller");

const router = express.Router();

router.post(
  "/send",
  authMiddleware,
  validate({ body: QuizzesValidationSchema }),
  QuizzesController.send
);

module.exports = {
  router,
};
