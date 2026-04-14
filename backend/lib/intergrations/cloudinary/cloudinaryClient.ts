import {
  v2 as cloudinary,
  UploadApiResponse,
  ResourceApiResponse,
} from "cloudinary";
import streamifier from "streamifier";
import { ChatFolderResolver } from "../../utils/chatMediaResolver";
import CustomError from "../../utils/customError";
import { HTTPStatusText } from "../../types/httpStatusText";

interface ListParams {
  chatId: string | number;
  maxResults?: number;
  nextCursor?: string;
}

interface UploadParams {
  buffer: Buffer;
  chatId: string | number;
  originalName: string;
}

export class CloudinaryClient {
  private static instance: CloudinaryClient | null = null;
  private static configured: boolean = false;

  public static getInstance(): CloudinaryClient {
    if (!this.instance) {
      this.instance = new CloudinaryClient();
    }
    return this.instance;
  }

  private static ensureCloudinaryConfigured(): void {
    if (this.configured) {
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.configured = true;
  }

  public static uploadBufferToCloudinary = async ({
    buffer,
    chatId,
    originalName,
  }: UploadParams): Promise<UploadApiResponse> => {
    this.ensureCloudinaryConfigured();

    const folder = ChatFolderResolver.resolveFolderName(chatId);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          use_filename: true,
          unique_filename: true,
          filename_override: originalName,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(
              new CustomError(
                "Cloudinary upload failed: No result returned.",
                500,
                HTTPStatusText.FAIL,
              ),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  };

  public static listImagesByChatId = async ({
    chatId,
    maxResults = 30,
    nextCursor,
  }: ListParams): Promise<ResourceApiResponse> => {
    this.ensureCloudinaryConfigured();

    const folder = ChatFolderResolver.resolveFolderName(chatId);

    return cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: `${folder}/`,
      max_results: maxResults,
      next_cursor: nextCursor,
    });
  };
}

export const uploadBufferToCloudinary = CloudinaryClient.uploadBufferToCloudinary;
export const listImagesByChatId = CloudinaryClient.listImagesByChatId;

