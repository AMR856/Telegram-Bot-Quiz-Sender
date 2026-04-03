const axios = require("axios");

class TelegramClient {
  constructor({ baseUrl, isChannel }) {
    if (!baseUrl) {
      throw new Error("Telegram API base URL is required.");
    }

    this.baseUrl = baseUrl;
    this.isChannel = Boolean(isChannel);
  }

  async sendMessage(chatId, text) {
    return this.#post("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(this.isChannel ? { disable_notification: false } : {}),
    });
  }

  async sendPoll(chatId, payload) {
    return this.#post("sendPoll", {
      chat_id: chatId,
      ...payload,
      ...(this.isChannel ? { disable_notification: false } : {}),
    });
  }

  async #post(method, payload) {
    const response = await axios.post(`${this.baseUrl}/${method}`, payload);
    return response.data;
  }
}

module.exports = { TelegramClient };
