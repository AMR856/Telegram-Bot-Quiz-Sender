const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { ImageValidationSchema } = require("./images.validation");
const { ImageController } = require("./images.controller");
const { validate } = require("../../middlewares/validate");
const UploadConfig = require("../../config/upload");

const imageRouter = express.Router();

imageRouter.post(
  "/upload",
  authMiddleware,
  UploadConfig.single("image"),
  validate({ file: ImageValidationSchema.uploadFile }),
  ImageController.upload,
);

module.exports = { imageRouter };
