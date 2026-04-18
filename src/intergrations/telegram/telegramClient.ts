import axios, { AxiosError } from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { HTTPStatusText } from "../../types/httpStatusText";
import CustomError from "../../utils/customError";
import { LoggerService } from "../../utils/logger";

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
    // Can't construct without a base URL for the bot
    if (!baseUrl) {
      throw new CustomError(
        "Telegram API base URL is required.",
        400,
        HTTPStatusText.FAIL,
      );
    }

    this.baseUrl = baseUrl;
    this.isChannel = !!isChannel;
  }

  public async sendMessage(
    chatId: string | number,
    text: string,
  ): Promise<any> {
    // The sendMessage method is used to send a text message to a specified chat ID.
    // It constructs the payload with the chat ID, message text, and parse mode (set to HTML for rich formatting).
    // If the client is configured for a channel, it also includes the disable_notification parameter set to false to ensure that notifications are sent for the message.
    // The method then calls the private post method to make the API request to Telegram.
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
        // disabling notfication is set to false if it's a channel
        ...(this.isChannel ? { disable_notification: false } : {}),
      });
    } catch (error) {
      // If Telegram fails to fetch the remote URL, we download it and re-upload as multipart
      if (this.isHttpUrl(photo) && this.isTelegramHttpUrlFetchFailure(error)) {
        // We attempt to download the image from the provided URL.
        // If the download fails or the content type is not an image,
        // we rethrow the original error to avoid masking other issues.
        const remoteImage = await axios.get(photo, {
          responseType: "stream",
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        // Validate that the content type of the downloaded file is an image before attempting to re-upload it to Telegram.
        const remoteContentType = String(
          remoteImage.headers?.["content-type"] || "",
        ).toLowerCase();
        // If the content type is not an image, we throw the original error to avoid masking the issue with a potentially more confusing error from the multipart upload attempt.
        if (!remoteContentType.startsWith("image/")) {
          throw error;
        }

        // Extract the filename from the URL for better traceability in Telegram and Cloudinary.
        // If the URL does not contain a valid filename,
        // we default to "image.jpg" to ensure that the upload can proceed without issues related to missing filenames.
        const fileNameFromUrl =
          path.basename(new URL(photo).pathname) || "image.jpg";

        // We attempt to send the photo as multipart/form-data using the downloaded image stream.
        return this.sendPhotoMultipart(chatId, remoteImage.data, payload, {
          filename: fileNameFromUrl,
        });
      }

      // We threw the same old error if we failed
      throw error;
    }
  }

  public async sendPoll(
    chatId: string | number,
    payload: Record<string, any>,
  ): Promise<any> {
    try {
    return this.post("sendPoll", {
      chat_id: chatId,
      ...payload,
      // disabling notfication is set to false if it's a channel
      ...(this.isChannel ? { disable_notification: false } : {}),
    });
    }
    catch (err){
      LoggerService.info(`Failed to send poll via Telegram API: ${(err as AxiosError).message}`);
    }
  }

  private isLocalFile(filePath: string): boolean {
    try {
      return path.isAbsolute(filePath) && fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  // Checks if the provided value is an HTTP or HTTPS URL.
  private isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  // Determines if an error from Telegram is due to a failure in fetching the content from a provided HTTP URL.
  // It checks if the error response has a status code of 400 and if the description contains any of the known patterns that indicate a failure to fetch the URL content.
  private isTelegramHttpUrlFetchFailure(error: any): boolean {
    // Get the error description from the Telegram API response, if available, and convert it to lowercase for case-insensitive comparison.
    const description = String(
      error.response?.data?.description || "",
    ).toLowerCase();
    return (
      error.response?.status === 400 &&
      // Check if the error description contains any of the known patterns that indicate a failure to fetch the URL content.
      // This helps us determine if we should attempt to download and re-upload the image as a workaround.
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
  
    // Adding the chat_id (It must be a string and form data handles encoding)
    formData.append("chat_id", String(chatId));
    // Adding the photo to be sent
    formData.append(
      "photo",
      photoValue,
      options.filename ? { filename: options.filename } : undefined, // The filename of the photo
    );

    // Adding the remaining fields in the payload, and they should be converted to json 
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Form data requires values to be strings or blobs
        const formattedValue =
          typeof value === "object" ? JSON.stringify(value) : value;
        formData.append(key, formattedValue);
      }
    });

    // Send a notification to users if we're in a channel not a group
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
