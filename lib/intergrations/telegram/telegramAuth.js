const axios = require("axios");
const { CustomError } = require("../../core/customError");
const HttpStatusMessages = require("../../core/httpStatusMessages");

class TelegramAuth {
  static async verifyBotToken(botToken) {
    const normalizedBotToken = String(botToken || "").trim();

    if (!normalizedBotToken) {
      throw new CustomError(400, "botToken is required", {
        statusText: HttpStatusMessages.FAIL,
      });
    }

    const baseUrl = `https://api.telegram.org/bot${normalizedBotToken}`;
    const response = await axios.get(`${baseUrl}/getMe`);
    return response.data;
  }
}

module.exports = { TelegramAuth };
