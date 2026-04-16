import axios, { AxiosError } from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { HTTPStatusText } from "../../types/httpStatusText";
import CustomError from "../../utils/customError";

const TELEGRAM_URL_CONTENT_FAILURE_PATTERNS = [
  "failed to get http url content",
  "wrong type of the web page content",
];

interface TelegramClientConfig {
  baseUrl: string;
  isChannel?: boolean;
}

interface PhotoOptions {
  filename?: string;
}

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly isChannel: boolean;

  constructor({ baseUrl, isChannel }: TelegramClientConfig) {
    if (!baseUrl) {
      throw new CustomError("Telegram API base URL is required.", 400, HTTPStatusText.FAIL);
    }

    this.baseUrl = baseUrl;
    this.isChannel = !!isChannel;
  }

  public async sendMessage(
    chatId: string | number,
    text: string,
  ): Promise<any> {
    return this.post("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(this.isChannel ? { disable_notification: false } : {}),
    });
  }

  public async sendPhoto(
    chatId: string | number,
    photo: string,
    payload: Record<string, any> = {},
  ): Promise<any> {
    // Check if it's a local file
    if (this.isLocalFile(photo)) {
      return this.sendPhotoMultipart(
        chatId,
        fs.createReadStream(photo),
        payload,
        {
          filename: path.basename(photo),
        },
      );
    }

    try {
      return await this.post("sendPhoto", {
        chat_id: chatId,
        photo,
        ...payload,
        ...(this.isChannel ? { disable_notification: false } : {}),
      });
    } catch (error) {
      // If Telegram fails to fetch the remote URL, we download it and re-upload as multipart
      if (this.isHttpUrl(photo) && this.isTelegramHttpUrlFetchFailure(error)) {
        const remoteImage = await axios.get(photo, {
          responseType: "stream",
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        const remoteContentType = String(
          remoteImage.headers?.["content-type"] || "",
        ).toLowerCase();
        if (!remoteContentType.startsWith("image/")) {
          throw error;
        }

        const fileNameFromUrl =
          path.basename(new URL(photo).pathname) || "image.jpg";

        return this.sendPhotoMultipart(chatId, remoteImage.data, payload, {
          filename: fileNameFromUrl,
        });
      }

      throw error;
    }
  }

  public async sendPoll(
    chatId: string | number,
    payload: Record<string, any>,
  ): Promise<any> {
    return this.post("sendPoll", {
      chat_id: chatId,
      ...payload,
      ...(this.isChannel ? { disable_notification: false } : {}),
    });
  }

  private isLocalFile(filePath: string): boolean {
    try {
      return path.isAbsolute(filePath) && fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  private isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private isTelegramHttpUrlFetchFailure(error: any): boolean {
    const description = String(
      error.response?.data?.description || "",
    ).toLowerCase();
    return (
      error.response?.status === 400 &&
      TELEGRAM_URL_CONTENT_FAILURE_PATTERNS.some((pattern) =>
        description.includes(pattern),
      )
    );
  }

  private async sendPhotoMultipart(
    chatId: string | number,
    photoValue: any,
    payload: Record<string, any> = {},
    options: PhotoOptions = {},
  ): Promise<any> {
    const formData = new FormData();

    formData.append("chat_id", String(chatId));
    formData.append(
      "photo",
      photoValue,
      options.filename ? { filename: options.filename } : undefined,
    );

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Form data requires values to be strings or blobs
        const formattedValue =
          typeof value === "object" ? JSON.stringify(value) : value;
        formData.append(key, formattedValue);
      }
    });

    if (this.isChannel) {
      formData.append("disable_notification", "false");
    }

    const response = await axios.post(`${this.baseUrl}/sendPhoto`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return response.data;
  }

  private async post(
    method: string,
    payload: Record<string, any>,
  ): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/${method}`, payload);
    return response.data;
  }
}
