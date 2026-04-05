const multer = require("multer");

class UploadConfig {
  static #MAX_FILE_SIZE = Number(
    process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024
  );
  static #upload = null;

  static #initializeUpload() {
    if (!this.#upload) {
      this.#upload = multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: this.#MAX_FILE_SIZE,
        },
      });
    }
    return this.#upload;
  }

  static getInstance() {
    return this.#initializeUpload();
  }

  static single(fieldName) {
    return this.getInstance().single(fieldName);
  }

  static array(fieldName, maxCount) {
    return this.getInstance().array(fieldName, maxCount);
  }

  static fields(fields) {
    return this.getInstance().fields(fields);
  }

  static getMaxFileSize() {
    return this.#MAX_FILE_SIZE;
  }
}

module.exports = UploadConfig;