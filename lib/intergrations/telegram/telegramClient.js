const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const TELEGRAM_URL_CONTENT_FAILURE_PATTERNS = [
  "failed to get http url content",
  "wrong type of the web page content",
];

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

  async sendPhoto(chatId, photo, payload = {}) {
    if (typeof photo === "string" && this.#isLocalFile(photo)) {
      return this.#sendPhotoMultipart(chatId, fs.createReadStream(photo), payload, {
        filename: path.basename(photo),
      });
    }

    try {
      return await this.#post("sendPhoto", {
        chat_id: chatId,
        photo,
        ...payload,
        ...(this.isChannel ? { disable_notification: false } : {}),
      });
    } catch (error) {
      if (
        typeof photo === "string" &&
        this.#isHttpUrl(photo) &&
        this.#isTelegramHttpUrlFetchFailure(error)
      ) {
        const remoteImage = await axios.get(photo, {
          responseType: "stream",
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        const remoteContentType = String(remoteImage.headers?.["content-type"] || "").toLowerCase();
        if (!remoteContentType.startsWith("image/")) {
          throw error;
        }

        const fileNameFromUrl = path.basename(new URL(photo).pathname) || "quiz-image.jpg";

        return this.#sendPhotoMultipart(
          chatId,
          remoteImage.data,
          payload,
          { filename: fileNameFromUrl },
        );
      }

      throw error;
    }
  }

  async sendPoll(chatId, payload) {
    return this.#post("sendPoll", {
      chat_id: chatId,
      ...payload,
      ...(this.isChannel ? { disable_notification: false } : {}),
    });
  }

  #isLocalFile(filePath) {
    return path.isAbsolute(filePath) && fs.existsSync(filePath);
  }

  #isHttpUrl(value) {
    return /^https?:\/\//i.test(value);
  }

  #isTelegramHttpUrlFetchFailure(error) {
    const description = String(error.response?.data?.description || "").toLowerCase();
    return (
      error.response?.status === 400 &&
      TELEGRAM_URL_CONTENT_FAILURE_PATTERNS.some((pattern) => description.includes(pattern))
    );
  }

  async #sendPhotoMultipart(chatId, photoValue, payload = {}, options = {}) {
    const formData = new FormData();

    formData.append("chat_id", chatId);
    formData.append("photo", photoValue, options.filename ? { filename: options.filename } : undefined);

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    }

    if (this.isChannel) {
      formData.append("disable_notification", "false");
    }

    const response = await axios.post(
      `${this.baseUrl}/sendPhoto`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    return response.data;
  }

  async #post(method, payload) {
    const response = await axios.post(`${this.baseUrl}/${method}`, payload);
    return response.data;
  }
}

module.exports = { TelegramClient };
