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
  UploadConfig.single("file"),
  validate({ file: ImageValidationSchema.uploadFile }),
  ImageController.upload,
);

imageRouter.get("/", authMiddleware, ImageController.list);

imageRouter.post(
  "/upload-many",
  authMiddleware,
  UploadConfig.array("files", 20),
  validate({ files: ImageValidationSchema.uploadFiles }),
  ImageController.uploadMany,
);

imageRouter.delete(
  "/:publicId(*)",
  authMiddleware,
  validate({ params: ImageValidationSchema.deleteParams }),
  ImageController.delete,
);
