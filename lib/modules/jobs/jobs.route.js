const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { JobsValidationSchema } = require("./jobs.validation");
const { JobsController } = require("./jobs.controller");

const router = express.Router();

router.get(
  "/:id",
  authMiddleware,
  validate({ params: JobValidationSchema.idParam }),
  JobController.getStatus,
);

module.exports = {
  router,
};
