import { Request, Response, NextFunction } from "express";
import { HTTPStatusText } from "../../types/httpStatusText";
import { ImageService } from "./images.service";

export class ImageController {
  public static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = res.locals.file; 
      const user = res.locals.user;
      const data = await ImageService.upload({ file, user: user });
      res.status(201).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, nextCursor } = res.locals.query || req.query;
      const user = res.locals.user;
      const data = await ImageService.list({
        user,
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

  public static async uploadMany(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const files = res.locals.files || req.files;
      const user = res.locals.user;
      const data = await ImageService.uploadMany({ files, user });

      res.status(201).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { publicId } = res.locals.params || req.params;
      const user = res.locals.user;
      const data = await ImageService.delete({ publicId, user });

      res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
