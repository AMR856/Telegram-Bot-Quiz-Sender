const { uploadImageForUser } = require("./images.service");
const HttpMessages = require("../../types/statusMessages");
const { createHttpError } = require("../../utils/httpError");
const { sendSuccess } = require("../../utils/httpResponse");

const uploadImage = async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, "image file is required", {
      statusText: HttpMessages.FAIL,
    });
  }

  const data = await uploadImageForUser({ file: req.file, user: req.user });
  return sendSuccess(res, 201, data);
};

module.exports = {
  uploadImage,
};
