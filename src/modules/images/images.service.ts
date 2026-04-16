import {
  deleteImageByPublicId,
  listImagesByChatId,
  uploadBufferToCloudinary,
} from "../../intergrations/cloudinary/cloudinaryClient";
import { ChatFolderResolver } from "../../utils/chatMediaResolver";
import CustomError from "../../utils/customError";
import { HTTPStatusText } from "../../types/httpStatusText";

interface ImageServiceUser {
  chatId: string | number;
}

interface ImageServiceUploadParams {
  file: { buffer: Buffer; originalname: string };
  user: ImageServiceUser;
}

interface ImageServiceListParams {
  user: ImageServiceUser;
  limit?: number;
  nextCursor?: string;
}

interface ImageServiceUploadManyParams {
  files: Array<{ buffer: Buffer; originalname: string }>;
  user: ImageServiceUser;
}

interface ImageServiceDeleteParams {
  publicId: string;
  user: ImageServiceUser;
}

export class ImageService {
  public static upload = async ({ file, user }: ImageServiceUploadParams) => {
    const uploaded = await uploadBufferToCloudinary({
      buffer: file.buffer, // The file buffer that we want to upload to Cloudinary, which is obtained from the uploaded file in the request. This buffer contains the binary data of the file.
      chatId: user.chatId,
      originalName: file.originalname,
    });

    return {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      originalName: file.originalname,
      folder: ChatFolderResolver.resolveFolderName(user.chatId),
    };
  };

  public static list = async ({
    user,
    limit = 30,
    nextCursor,
  }: ImageServiceListParams) => {
    const resources = await listImagesByChatId({
      chatId: user.chatId,
      maxResults: limit,
      nextCursor,
    });

    return {
      folder: ChatFolderResolver.resolveFolderName(user.chatId),
      count: Array.isArray(resources.resources) ? resources.resources.length : 0,
      nextCursor: resources.next_cursor || null,
      images: (resources.resources || []).map((image) => ({
        originalName:
          image?.context?.custom?.original_name ||
          image?.context?.custom?.originalName ||
          image.original_filename ||
          image.filename,
        publicId: image.public_id,
        url: image.secure_url,
        secureUrl: image.secure_url,
        format: image.format,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        createdAt: image.created_at,
      })),
    };
  };

  public static uploadMany = async ({
    files,
    user,
  }: ImageServiceUploadManyParams) => {
    const results = await Promise.allSettled(
      files.map((file) =>
        uploadBufferToCloudinary({
          buffer: file.buffer,
          chatId: user.chatId,
          originalName: file.originalname,
        }),
      ),
    );

    const successfulUploads = results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return {
            url: result.value.secure_url,
            secureUrl: result.value.secure_url,
            publicId: result.value.public_id,
            originalName: files[index]?.originalname,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    const failedCount = results.filter((r) => r.status === 'rejected').length;

    if (failedCount > 0 && successfulUploads.length === 0) {
      throw new CustomError(
        `Failed to upload all ${files.length} images`,
        400,
        HTTPStatusText.FAIL,
      );
    }

    return {
      folder: ChatFolderResolver.resolveFolderName(user.chatId),
      count: successfulUploads.length,
      images: successfulUploads,
      failedCount: failedCount > 0 ? failedCount : undefined,
    };
  };

  public static delete = async ({
    publicId,
    user,
  }: ImageServiceDeleteParams) => {
    const normalizedPublicId = String(publicId || "").trim();
    const folder = ChatFolderResolver.resolveFolderName(user.chatId);

    if (!normalizedPublicId.startsWith(`${folder}/`)) {
      throw new CustomError(
        "image does not belong to this user",
        403,
        HTTPStatusText.FAIL,
      );
    }

    const result = await deleteImageByPublicId({ publicId: normalizedPublicId });

    if (result.result !== "ok") {
      throw new CustomError("image not found", 404, HTTPStatusText.FAIL);
    }

    return {
      deleted: true,
      publicId: normalizedPublicId,
      folder,
    };
  };
}
