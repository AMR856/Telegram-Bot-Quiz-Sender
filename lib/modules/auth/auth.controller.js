const { sendSuccess } = require("../../utils/httpResponse");
const authService = require("./auth.service");
const AuthValidationSchema = require("./auth.validation");

class AuthController {
  static async signIn(req, res, next) {
    try {
      const data = await authService.signInUser({
        chatId,
        botToken,
        isChannel,
      });

      res.status(201).json({
        status: HttpStatusText.SUCCESS,
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
