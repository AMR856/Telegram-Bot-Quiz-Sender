import express from "express";
import { UploadConfig } from "../../config/upload";
import { authMiddleware } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { ImageController } from "./images.controller";
import { ImageValidationSchema } from "./images.validation";

export const imageRouter = express.Router();

imageRouter.post(
  "/upload",
  authMiddleware,
  validate({ file: ImageValidationSchema.uploadFile }),
  UploadConfig.single("file"),
  ImageController.upload,
);

imageRouter.get("/", authMiddleware, ImageController.list);

imageRouter.post(
  "/upload-many",
  authMiddleware,
  UploadConfig.array("files", 20),
  ImageController.uploadMany,
);
