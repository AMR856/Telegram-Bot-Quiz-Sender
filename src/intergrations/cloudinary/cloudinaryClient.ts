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

interface DeleteParams {
  publicId: string;
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

  // Ensures that Cloudinary is configured before any operation.
  // ! This method is called at the beginning of each public static method to guarantee that the Cloudinary client is ready to use.
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
      // The upload_stream method of the Cloudinary SDK allows us to upload a file by streaming its data,
      // which is more efficient for large files.
      // We create a readable stream from the buffer using streamifier and pipe it into the upload stream provided by Cloudinary.
      // The upload stream is configured with options such as the target folder, resource type, and filename settings.
      // The callback function handles the response from Cloudinary, resolving with the result if successful or rejecting with an error if something goes wrong.
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image", // Only images are handled in this API
          use_filename: true, // Use the original filename when uploading
          unique_filename: true, // Allow Cloudinary to generate a unique filename to prevent collisions, while still using the original name as part of the final filename for better traceability.
          filename_override: originalName, // Override the filename with the original name from the uploaded file for better traceability in Cloudinary, while still ensuring uniqueness with the unique_filename option.
          context: {
            original_name: originalName,
          },
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

      // The streamifier library is used to convert the buffer containing the file data into a readable stream,
      // which is then piped into the Cloudinary upload stream.
      // This allows for efficient uploading of the file data to Cloudinary without needing to write it to disk first.
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  };

  public static listImagesByChatId = async ({
    chatId,
    maxResults = 30,
    nextCursor,
  }: ListParams): Promise<ResourceApiResponse> => {
    this.ensureCloudinaryConfigured();

    // Getting the folder name of this specfic chat
    const folder = ChatFolderResolver.resolveFolderName(chatId);

    // The cloudinary.api.resources method is used to list the uploaded images for a specific chat.
    return cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: `${folder}/`,
      max_results: maxResults,
      next_cursor: nextCursor,
      context: true,
    });
  };

  public static deleteImageByPublicId = async ({
    publicId,
  }: DeleteParams): Promise<{ result: string }> => {
    this.ensureCloudinaryConfigured();

    // The cloudinary.uploader.destroy method is used to delete an image from Cloudinary using its public ID.
    return cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  };
}

export const uploadBufferToCloudinary =
  CloudinaryClient.uploadBufferToCloudinary;
export const listImagesByChatId = CloudinaryClient.listImagesByChatId;
export const deleteImageByPublicId = CloudinaryClient.deleteImageByPublicId;
