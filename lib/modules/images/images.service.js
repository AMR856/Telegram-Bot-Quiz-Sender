const { ChatFolderResolver } = require("../../utils/quizMedia");
const { uploadBufferToCloudinary } = require("../../integrations/cloudinary.client");

const uploadImageForUser = async ({ file, user }) => {
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

module.exports = {
  uploadImageForUser,
};
