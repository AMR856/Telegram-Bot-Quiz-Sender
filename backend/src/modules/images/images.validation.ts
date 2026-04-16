import { z } from "zod";

export class ImageValidationSchema {
  public static uploadFile = z.custom((value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    return (
      Buffer.isBuffer(value.buffer) &&
      typeof value.originalname === "string" &&
      value.originalname.trim().length > 0
    );
  }, "image file is required");

  public static listQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    nextCursor: z.string().trim().min(1).optional(),
  });

  public static uploadFiles = z
    .array(this.uploadFile)
    .min(1, "at least one image file is required")
    .max(10, "you can upload up to 10 images at once");

  public static deleteParams = z.object({
    publicId: z.string().trim().min(1, "publicId is required"),
  });
}
