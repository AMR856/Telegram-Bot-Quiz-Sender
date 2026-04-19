import express from "express";
import { TelegramController } from "./telegram.controller";

export const telegramRouter = express.Router();

// Webhook endpoint for receiving updates from Telegram about poll answers
telegramRouter.post("/webhook/:userId/:secret", TelegramController.webhook);
