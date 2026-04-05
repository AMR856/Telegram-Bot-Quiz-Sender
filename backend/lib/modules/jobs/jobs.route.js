const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { JobValidationSchema } = require("./jobs.validation");
const { JobController } = require("./jobs.controller");

const jobsRouter = express.Router();

jobsRouter.get(
  "/:id",
  authMiddleware,
  validate({ params: JobValidationSchema.idParam }),
  JobController.getStatus,
);

module.exports = {
  jobsRouter,
};
