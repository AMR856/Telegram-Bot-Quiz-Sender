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
}

module.exports = { ImageController };
