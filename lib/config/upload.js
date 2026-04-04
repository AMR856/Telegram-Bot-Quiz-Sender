const multer = require("multer");

const buildUpload = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
    },
  });

module.exports = {
  buildUpload,
};
