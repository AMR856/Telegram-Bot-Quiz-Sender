import express from "express";
import { HealthController } from "./health.controller";

export const healthRouter = express.Router();
healthRouter.get("/", HealthController.health);
