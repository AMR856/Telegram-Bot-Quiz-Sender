const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { ImageValidationSchema } = require("./images.validation");
const { ImageController } = require("./images.controller");
const { validate } = require('../../middlewares/validate');

const router = express.Router();

router.post(
  "/upload",
  authMiddleware,
  upload.single("image"),
  validate({ file: ImageValidationSchema.upload.shape.file }),
  ImageController.upload,
);

module.exports = { router };
