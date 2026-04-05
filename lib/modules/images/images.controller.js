const { ImageService } = require("./images.service");

class ImageController {
  static async upload(req, res, next) {
    try {
      const data = await ImageService.upload({ file, user: req.user });
      res.status(201).json({
        status: HttpStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { ImageController };
