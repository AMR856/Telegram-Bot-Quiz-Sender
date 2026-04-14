import express from "express";
import { authMiddleware } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { JobController } from "./jobs.controller";
import { JobValidationSchema } from "./jobs.validation";

export const jobsRouter = express.Router();

jobsRouter.get(
  "/:id",
  authMiddleware,
  validate({ params: JobValidationSchema.idParam }),
  JobController.getStatus,
);
