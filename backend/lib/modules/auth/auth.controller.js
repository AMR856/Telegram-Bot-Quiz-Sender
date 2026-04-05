const HttpStatusMessages = require("../../core/httpStatusMessages");
const authService = require("./auth.service");

class AuthController {
  static async signIn(req, res, next) {
    try {
      const { chatId, botToken, isChannel } = res.locals.body || req.body;

      const data = await authService.signInUser({
        chatId,
        botToken,
        isChannel,
      });

      res.status(201).json({
        status: HttpStatusMessages.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  AuthController,
};
