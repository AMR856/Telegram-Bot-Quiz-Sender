import { HTTPStatusText } from "../../types/httpStatusText";
import { AuthService } from "./auth.service";

export class AuthController {
  public static async signIn(req, res, next) {
    try {
      const { chatId, botToken, isChannel } = res.locals.body || req.body;

      const data = await AuthService.signInUser({
        chatId,
        botToken,
        isChannel,
      });

      res.status(201).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
