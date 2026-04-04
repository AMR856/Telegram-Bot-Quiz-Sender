const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { sanitizeChatFolderFromChatId } = require("../utils/quizMedia");

const ensureCloudinaryConfigured = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const uploadBufferToCloudinary = async ({ buffer, chatId, originalName }) => {
  ensureCloudinaryConfigured();

  const folder = sanitizeChatFolderFromChatId(chatId);

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
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = {
  uploadBufferToCloudinary,
};
