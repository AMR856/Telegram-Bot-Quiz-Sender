const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { ImageValidationSchema } = require("./images.validation");
const { ImageController } = require("./images.controller");
const { validate } = require("../../middlewares/validate");
const UploadConfig = require("../../config/upload");

const imageRouter = express.Router();

imageRouter.get(
  "/",
  authMiddleware,
  validate({ query: ImageValidationSchema.listQuery }),
  ImageController.list,
);

imageRouter.post(
  "/upload",
  authMiddleware,
  UploadConfig.single("image"),
  validate({ file: ImageValidationSchema.uploadFile }),
  ImageController.upload,
);

imageRouter.post(
  "/upload-many",
  authMiddleware,
  UploadConfig.array("images", 10),
  validate({ files: ImageValidationSchema.uploadFiles }),
  ImageController.uploadMany,
);

module.exports = { imageRouter };
