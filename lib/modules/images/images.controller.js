const { uploadImageForUser } = require("./images.service");
const { uploadImageRequestSchema } = require("./images.validation");
const { sendSuccess } = require("../../utils/httpResponse");

const uploadImage = async (req, res) => {
  const { file } = uploadImageRequestSchema.parse({ file: req.file });
  const data = await uploadImageForUser({ file, user: req.user });
  return sendSuccess(res, 201, data);
};

module.exports = {
  uploadImage,
};
