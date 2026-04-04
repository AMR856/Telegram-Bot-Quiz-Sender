const { sanitizeChatFolderFromChatId } = require("../../utils/quizMedia");
const { uploadBufferToCloudinary } = require("../../integrations/cloudinaryClient");

const uploadImageForUser = async ({ file, user }) => {
  const uploaded = await uploadBufferToCloudinary({
    buffer: file.buffer,
    chatId: user.chatId,
    originalName: file.originalname,
  });

  return {
    secureUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    folder: sanitizeChatFolderFromChatId(user.chatId),
  };
};

module.exports = {
  uploadImageForUser,
};
