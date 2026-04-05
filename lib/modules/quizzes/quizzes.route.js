const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { QuizzesValidationSchema } = require("./quizzes.validation");
const { QuizzesController } = require("./quizzes.controller");

const quizzesRouter = express.Router();

quizzesRouter.post(
  "/send",
  authMiddleware,
  validate({ body: QuizzesValidationSchema.sendQuizzesBodySchema }),
  QuizzesController.send,
);

module.exports = {
  quizzesRouter,
};
