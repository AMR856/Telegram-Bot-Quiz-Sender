import axios from "axios";
import { HTTPStatusText } from "../../types/httpStatusText";
import CustomError from "../../utils/customError";

export class TelegramAuth {
  static async verifyBotToken(botToken) {
    const normalizedBotToken = String(botToken || "").trim();

    if (!normalizedBotToken) {
      throw new CustomError("botToken is required", 400, HTTPStatusText.FAIL);
    }

    // Telegram API endpoint to get bot information
    const baseUrl = `https://api.telegram.org/bot${normalizedBotToken}`;
    const response = await axios.get(`${baseUrl}/getMe`);
    return response.data;
  }

  static async setWebhook({
    botToken,
    webhookUrl,
  }: {
    botToken: string;
    webhookUrl: string;
  }) {
    // Validating the bot token and webhook URL before making the API request to Telegram. 
    // The bot token is required to authenticate the request to Telegram's API, and the webhook URL is required to specify where Telegram should send updates for the bot. 
    // If either of these parameters is missing or empty, a CustomError is thrown with an appropriate message and HTTP status code.
    const normalizedBotToken = String(botToken || "").trim();
    const normalizedWebhookUrl = String(webhookUrl || "").trim();

    if (!normalizedBotToken) {
      throw new CustomError("botToken is required", 400, HTTPStatusText.FAIL);
    }

    if (!normalizedWebhookUrl) {
      throw new CustomError(
        "webhookUrl is required",
        400,
        HTTPStatusText.FAIL,
      );
    }

    const baseUrl = `https://api.telegram.org/bot${normalizedBotToken}`;

    const response = await axios.post(`${baseUrl}/setWebhook`, {
      url: normalizedWebhookUrl,
      allowed_updates: ["message", "poll_answer"],
      // The drop_pending_updates parameter is set to false to ensure that any pending updates that were received by Telegram before the webhook was set will still be delivered to the specified webhook URL.
      drop_pending_updates: false,
    });

    return response.data;
  }
}
