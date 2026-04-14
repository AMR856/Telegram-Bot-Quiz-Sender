import { HTTPStatusText } from "../../types/httpStatusText";
import { ImageService } from "./images.service";

export class ImageController {
  public static async upload(req, res, next) {
    try {
      const file = res.locals.file || req.file;
      const data = await ImageService.upload({ file, user: req.user });
      res.status(201).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req, res, next) {
    try {
      const { limit, nextCursor } = res.locals.query || req.query;
      const data = await ImageService.list({
        user: req.user,
        limit,
        nextCursor,
      });

      res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadMany(req, res, next) {
    try {
      const files = res.locals.files || req.files;
      const data = await ImageService.uploadMany({ files, user: req.user });

      res.status(201).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req, res, next) {
    try {
      const { publicId } = res.locals.params || req.params;
      const data = await ImageService.delete({ publicId, user: req.user });

      res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
