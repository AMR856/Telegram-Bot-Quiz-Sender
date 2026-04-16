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
}
