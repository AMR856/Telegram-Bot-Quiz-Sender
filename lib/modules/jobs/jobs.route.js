const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { buildJobsController } = require("./jobs.controller");
const { asyncHandler } = require("../../utils/asyncHandler");

const buildJobsRouter = ({ queue }) => {
  const router = express.Router();
  const controller = buildJobsController({ queue });

  router.get("/:id", authMiddleware, asyncHandler(controller.getJobStatus));

  return router;
};

module.exports = {
  buildJobsRouter,
};
