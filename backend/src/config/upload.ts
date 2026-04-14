import multer, { Multer, StorageEngine } from "multer";
import { RequestHandler } from "express";

export class UploadConfig {
  private static readonly MAX_FILE_SIZE: number = Number(
    process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024,
  );

  private static uploadInstance: Multer | null = null;

  private static initializeUpload(): Multer {
    if (!this.uploadInstance) {
      this.uploadInstance = multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: this.MAX_FILE_SIZE,
        },
      });
    }
    return this.uploadInstance;
  }

  public static getInstance(): Multer {
    return this.initializeUpload();
  }

  public static single(fieldName: string): RequestHandler {
    return this.getInstance().single(fieldName);
  }

  public static array(fieldName: string, maxCount?: number): RequestHandler {
    return this.getInstance().array(fieldName, maxCount);
  }

  public static fields(fields: ReadonlyArray<multer.Field>): RequestHandler {
    return this.getInstance().fields(fields);
  }

  public static getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }
}
