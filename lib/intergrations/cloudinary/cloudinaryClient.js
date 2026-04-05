const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { ChatFolderResolver } = require("../../services/normalizers");

class CloudinaryClient {
  static #instance = null;
  static #configured = false;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new CloudinaryClient();
    }
    return this.#instance;
  }

  static #ensureCloudinaryConfigured() {
    if (this.#configured) {
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.#configured = true;
  }

  static uploadBufferToCloudinary = async ({
    buffer,
    chatId,
    originalName,
  }) => {
    this.#ensureCloudinaryConfigured();

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
            reject(error);
            return;
          }

          resolve(result);
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  };
}

module.exports = {
  CloudinaryClient,
  uploadBufferToCloudinary: CloudinaryClient.uploadBufferToCloudinary,
};
