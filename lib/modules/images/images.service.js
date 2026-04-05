const { ChatFolderResolver } = require("../../services/normalizers");
const {
  uploadBufferToCloudinary,
} = require("../../intergrations/cloudinary/cloudinaryClient");

class ImageService {
  static upload = async ({ file, user }) => {
    const uploaded = await uploadBufferToCloudinary({
      buffer: file.buffer,
      chatId: user.chatId,
      originalName: file.originalname,
    });

    return {
      secureUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      folder: ChatFolderResolver.resolveFolderName(user.chatId),
    };
  };
}

module.exports = {
  ImageService,
};
