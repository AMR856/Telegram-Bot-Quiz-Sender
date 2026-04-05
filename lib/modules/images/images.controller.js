const { ImageService } = require("./images.service");
const HttpStatusMessages = require("../../core/httpStatusMessages");

class ImageController {
  static async upload(req, res, next) {
    try {
      const file = res.locals.file || req.file;
      const data = await ImageService.upload({ file, user: req.user });
      res.status(201).json({
        status: HttpStatusMessages.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req, res, next) {
    try {
      const { limit, nextCursor } = res.locals.query || req.query;
      const data = await ImageService.list({
        user: req.user,
        limit,
        nextCursor,
      });

      res.status(200).json({
        status: HttpStatusMessages.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async uploadMany(req, res, next) {
    try {
      const files = res.locals.files || req.files;
      const data = await ImageService.uploadMany({ files, user: req.user });

      res.status(201).json({
        status: HttpStatusMessages.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { ImageController };
