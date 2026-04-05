const { ChatFolderResolver } = require("../../services/normalizers");
const {
  uploadBufferToCloudinary,
  listImagesByChatId,
} = require("../../intergrations/cloudinary/cloudinaryClient");

class ImageService {
  static upload = async ({ file, user }) => {
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

  static list = async ({ user, limit = 30, nextCursor }) => {
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

  static uploadMany = async ({ files, user }) => {
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

module.exports = {
  ImageService,
};
