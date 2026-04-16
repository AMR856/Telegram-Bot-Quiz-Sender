import express from "express";
import { HealthController } from "./health.controller";

export const healthRouter = express.Router();
// Health check endpoint (For load balancers, uptime monitoring, etc.)
healthRouter.get("/", HealthController.health);
// SSE endpoint for real-time health updates
healthRouter.get("/stream", HealthController.stream);
