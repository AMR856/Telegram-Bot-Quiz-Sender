import { Request, Response, NextFunction } from "express";
import { HTTPStatusText } from "../../types/httpStatusText";
import CustomError from "../../utils/customError";
import { UserModel } from "../auth/auth.model";
import { QuizAnswerTracker } from "../../services/quizAnswerTracker";
import { LoggerService } from "../../utils/logger";

const MESSAGES_LOG_FILE = "logs/messages.log";

export class TelegramController {
  public static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Extracting the userId and secret from the URL parameters to authenticate the incoming webhook request from Telegram
      const userId = String(req.params.userId || "").trim();
      const secret = String(req.params.secret || "").trim();

      // Finding the user associated with the provided webhook credentials to ensure that the request is legitimate and to identify which user's quiz answers are being tracked
      const user = await UserModel.getUserByWebhook(userId, secret);

      if (!user) {
        throw new CustomError(
          "Invalid webhook credentials",
          401,
          HTTPStatusText.FAIL,
        );
      }

      // Processing the incoming update from Telegram, specifically looking for poll answers which indicate that a user has interacted with a quiz question sent by the bot. 
      // The relevant information is extracted and passed to the QuizAnswerTracker service to keep track of users' answers and manage retries for wrong answers.
      const update = req.body || {};
      const message = update?.message;

      console.log(message);
      if (message?.chat) {
        LoggerService.logToFile(
          MESSAGES_LOG_FILE,
          `Group ID: ${message.chat.id}`,
        );
        LoggerService.logToFile(
          MESSAGES_LOG_FILE,
          `Group name: ${message.chat.title}`
        );

        return res
          .status(200)
          .json({ status: HTTPStatusText.SUCCESS, accepted: true });
      }

      const pollAnswer = update?.poll_answer;
      // {
      //   poll_id: "poll_abc_123",
      //   user: { id: 9876543210, ... },
      //   option_ids: [0, 1]
      // }
      if (!pollAnswer?.poll_id) {
        return res
          .status(200)
          .json({ status: HTTPStatusText.SUCCESS, accepted: false });
      }

      const pollAnswerUser = pollAnswer?.user;
      if (!pollAnswerUser?.id) {
        LoggerService.warn(
          `Skipping poll answer ${String(pollAnswer.poll_id)} because poll_answer.user.id is missing`,
        );
        return res
          .status(200)
          .json({ status: HTTPStatusText.SUCCESS, accepted: false });
      }

      const telegramUserId = String(pollAnswerUser.id || "").trim();
      const telegramUserIsBot = Boolean(pollAnswerUser.is_bot);

      // If the Telegram user ID cannot be extracted from the incoming update, 
      // it means that the answer cannot be associated with a specific user, 
      // and therefore it is not possible to track the quiz answer or manage retries for wrong answers. 
      // In this case, the webhook will acknowledge the update but indicate that it was not accepted for processing.
      if (!telegramUserId) {
        return res
          .status(200)
          .json({ status: HTTPStatusText.SUCCESS, accepted: false });
      }

      // Tracking the user's answer to the quiz question by associating the Telegram user ID with the poll ID and the selected option IDs.
      await QuizAnswerTracker.trackPollAnswer({
        ownerUserId: user.id,
        pollId: String(pollAnswer.poll_id),
        telegramUserId,
        telegramUserIsBot,
        selectedOptionIds: Array.isArray(pollAnswer.option_ids)
          ? pollAnswer.option_ids
          : [],
      });

      return res
        .status(200)
        .json({ status: HTTPStatusText.SUCCESS, accepted: true });
    } catch (error) {
      return next(error);
    }
  }
}
