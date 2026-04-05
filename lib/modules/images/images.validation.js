const { z } = require("zod");

class ImageValidationSchema {
  static uploadFile = z.custom((value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    return (
      Buffer.isBuffer(value.buffer) &&
      typeof value.originalname === "string" &&
      value.originalname.trim().length > 0
    );
  }, "image file is required");
}

module.exports = { ImageValidationSchema };
