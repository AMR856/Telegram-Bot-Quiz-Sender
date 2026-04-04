const { sendSuccess } = require("../../utils/httpResponse");
const authService = require("./auth.service");
const AuthValidationSchema = require("./auth.validation");

class AuthController {
  static async signIn(req, res) {
    const { chatId, botToken, isChannel } = AuthValidationSchema.signIn.parse(
      req.body || {},
    );
    const data = await authService.signInUser({ chatId, botToken, isChannel });

    return sendSuccess(res, 200, data);
  }
}

module.exports = {
  AuthController,
};
