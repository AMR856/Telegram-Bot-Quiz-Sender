const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { buildQuizzesController } = require("./quizzes.controller");
const { asyncHandler } = require("../../utils/asyncHandler");

const buildQuizzesRouter = ({ queue }) => {
  const router = express.Router();
  const controller = buildQuizzesController({ queue });

  router.post("/send", authMiddleware, asyncHandler(controller.sendQuizzes));

  return router;
};

module.exports = {
  buildQuizzesRouter,
};
