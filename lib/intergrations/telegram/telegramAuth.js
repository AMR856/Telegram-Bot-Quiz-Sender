const axios = require("axios");
const { CustomError } = require("../../core/customError");
const { HttpStatusCode } = require("axios");

class TelegramAuth {
  static async verifyBotToken(botToken) {
    const normalizedBotToken = String(botToken || "").trim();

    if (!normalizedBotToken) {
      throw new CustomError("botToken is required", 400, HttpStatusCode.FAIL);
    }

    const baseUrl = `https://api.telegram.org/bot${normalizedBotToken}`;
    const response = await axios.get(`${baseUrl}/getMe`);
    return response.data;
  }
}

module.exports = { TelegramAuth };
