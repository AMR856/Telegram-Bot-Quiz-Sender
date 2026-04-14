import {
  listImagesByChatId,
  uploadBufferToCloudinary,
} from "../../intergrations/cloudinary/cloudinaryClient";
import { ChatFolderResolver } from "../../utils/chatMediaResolver";

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

export class ImageService {
  public static upload = async ({ file, user }: ImageServiceUploadParams) => {
    const uploaded = await uploadBufferToCloudinary({
      buffer: file.buffer,
      chatId: user.chatId,
      originalName: file.originalname,
    });

    return {
      url: uploaded.secure_url,
      secureUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
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
    const uploads = await Promise.all(
      files.map((file) =>
        uploadBufferToCloudinary({
          buffer: file.buffer,
          chatId: user.chatId,
          originalName: file.originalname,
        }),
      ),
    );

    return {
      folder: ChatFolderResolver.resolveFolderName(user.chatId),
      count: uploads.length,
      images: uploads.map((uploaded) => ({
        url: uploaded.secure_url,
        secureUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
      })),
    };
  };
}
