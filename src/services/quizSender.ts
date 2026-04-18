import { LoggerService } from "../utils/logger";
import { Escaper } from "../utils/escaper";

const { escapeMarkdownV2, escapeHtml } = Escaper;

const POLL_QUESTION_CHAR_LIMIT = 300;
const POLL_EXPLANATION_CHAR_LIMIT = 200;
const POLL_OPTION_CHAR_LIMIT = 100;
const LONG_QUIZ_QUESTION = "Answer for the above question";
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface TelegramApiError {
  response?: {
    status: number;
    data?: {
      description?: string;
      parameters?: {
        retry_after?: number | string;
      };
    };
  };
  message?: string;
}

interface TelegramClient {
  sendMessage(chatId: string, text: string): Promise<any>;
  sendPhoto(chatId: string, photo: string): Promise<any>;
  sendPoll(chatId: string, payload: Record<string, any>): Promise<any>;
}

interface QuizSenderConfig {
  telegramClient: TelegramClient;
  isChannel?: boolean;
}

interface QuizSenderOptions {
  delayMs?: number;
  onSuccess?: (index: number) => Promise<void> | void;
  onPollSent?: (
    index: number,
    pollId: string,
    quiz: Quiz,
  ) => Promise<void> | void;
  onFailure?: (
    index: number,
    error: TelegramApiError | Error,
  ) => Promise<void> | void;
}

export interface Quiz {
  question: string;
  explanation?: string;
  options: string[];
  correctAnswerId: number;
  photo?: string;
  image?: string;
}

interface PreparedQuiz {
  canInlineExplanation: boolean;
  hasLongOption: boolean;
  question: string;
  explanation: string;
  markdownSpoilerExplanation: string;
  numberedOptions: string[];
  shortPollOptions: string[];
  needsSplitMessage: boolean;
  originalOptions: string[];
}

interface SendPollPayload {
  question: string;
  options: string[];
  type: "quiz" | "regular";
  correct_option_id?: number;
  explanation?: string;
  explanation_parse_mode?: string;
  is_anonymous?: boolean;
  allows_multiple_answers: boolean;
}

interface TelegramSendPollResponse {
  result?: {
    poll?: {
      id?: string;
    };
  };
}

export class QuizSender {
  private readonly telegramClient: TelegramClient;
  private readonly isChannel: boolean;

  constructor({ telegramClient, isChannel }: QuizSenderConfig) {
    if (!telegramClient) {
      throw new Error("telegramClient is required");
    }
    this.telegramClient = telegramClient;
    this.isChannel = Boolean(isChannel);
  }

  /**
   * Send a single quiz to a chat
   * Handles photos, character limits, and inline vs split message formatting
   */
  public async sendQuiz(chatId: string, quiz: Quiz): Promise<string | null> {
    this.validateQuiz(quiz);

    LoggerService.info('Validated the quiz');
    const preparedQuiz = this.prepareQuiz(quiz);
        LoggerService.info('Prepared the quiz');

    const quizPhoto = quiz.photo || quiz.image;

    if (quizPhoto) {
      await this.telegramClient.sendPhoto(chatId, quizPhoto);
      await this.sleep(500);
    }

    if (preparedQuiz.needsSplitMessage) {
      return this.sendSplitQuiz(chatId, quiz, preparedQuiz);
    }
    LoggerService.info('Sending the quiz as an inline message');
    return this.sendInlineQuiz(chatId, quiz, preparedQuiz);
  }

  /**
   * Send multiple quizzes with retry logic for rate limits (429)
   * Respects Telegram's rate limiting and calls callbacks on success/failure
   */
  public async sendAll(
    chatId: string,
    quizzes: Quiz[],
    { delayMs = 2000, onSuccess, onPollSent, onFailure }: QuizSenderOptions = {},
  ): Promise<void> {
    if (!quizzes || quizzes.length === 0) {
      LoggerService.warn("No quizzes to send");
      return;
    }

    LoggerService.info(
      `Starting to send ${quizzes.length} quizzes to ${chatId}`,
    );

    for (let index = 0; index < quizzes.length; index += 1) {
      let sent = false;

      while (!sent) {
        try {
          const pollId = await this.sendQuiz(chatId, quizzes[index]);

          if (pollId && onPollSent) {
            await onPollSent(index, pollId, quizzes[index]);
          }

          if (onSuccess) {
            await onSuccess(index);
          }

          sent = true;

          // Delay between quizzes (except last one)
          if (index < quizzes.length - 1) {
            await this.sleep(delayMs);
          }
        } catch (error) {
          const apiError = error as TelegramApiError;

          // Handle rate limiting (429 Too Many Requests)
          if (apiError.response?.status === 429) {
            const retryAfterSeconds = this.parseRetryAfter(apiError);

            LoggerService.warn(
              `Rate limited (429). Waiting ${retryAfterSeconds}s before retrying quiz ${index + 1}/${quizzes.length}`,
            );

            await this.sleep(retryAfterSeconds * 1000);
            continue; // Retry this quiz
          }

          if (onFailure) {
            const failureError =
              error instanceof Error
                ? error
                : new Error(String(error ?? "Unknown error"));
            await onFailure(index, failureError);
          }

          LoggerService.error(
            `Failed to send quiz ${index + 1}/${quizzes.length}: ${error}`,
          );

          sent = true; // Move to next quiz after failure
        }
      }
    }

    LoggerService.info(`Finished sending ${quizzes.length} quizzes`);
  }

  /**
   * Prepare quiz data for sending
   * Checks character limits, determines if split message is needed
   */
  private prepareQuiz(quiz: Quiz): PreparedQuiz {
    LoggerService.info('Preparing the quiz');
    const question = quiz.question || "";
    const explanation = quiz.explanation || "";
    const options = quiz.options || [];

    const hasLongOption = options.some(
      (option: string) => (option || "").length > POLL_OPTION_CHAR_LIMIT,
    );

    const markdownSpoilerExplanation = `||${escapeMarkdownV2(explanation)}||`;
    const canInlineExplanation =
      markdownSpoilerExplanation.length <= POLL_EXPLANATION_CHAR_LIMIT &&
      question.length <= POLL_QUESTION_CHAR_LIMIT &&
      !hasLongOption;

      LoggerService.info("Finished preparing the quiz");
    return {
      canInlineExplanation,
      hasLongOption,
      question,
      explanation,
      markdownSpoilerExplanation,
      numberedOptions: options.map((option: string, index: number) => {
        const label = OPTION_LABELS[index] || String(index + 1);
        return `${label}- ${option}`;
      }),
      shortPollOptions: options.map((_: string, index: number) => {
        const label = OPTION_LABELS[index] || String(index + 1);
        return `${label}.`;
      }),
      needsSplitMessage: !canInlineExplanation,
      originalOptions: options,
    };
  }

  /**
   * Send quiz as a single inline message with explanation
   * Used when everything fits within Telegram's character limits
   */
  private async sendInlineQuiz(
    chatId: string,
    quiz: Quiz,
    preparedQuiz: PreparedQuiz,
  ): Promise<string | null> {
    const payload: SendPollPayload = {
      question: quiz.question,
      options: preparedQuiz.originalOptions,
      type: "quiz",
      correct_option_id: quiz.correctAnswerId,
      explanation: preparedQuiz.markdownSpoilerExplanation,
      explanation_parse_mode: "MarkdownV2",
      is_anonymous: this.isChannel,
      allows_multiple_answers: false,
    };

    LoggerService.info(`Here is the response of sendPoll`);
    const response = (await this.telegramClient.sendPoll(
      chatId,
      payload,
    )) as TelegramSendPollResponse;
    LoggerService.info("We don'g get here");
    LoggerService.debug(`Inline quiz sent: ${quiz.question}`);

    return response?.result?.poll?.id || null;
  }

  /**
   * Send quiz as a split message (text explanation + poll)
   * Used when question/explanation/options exceed character limits
   */
  private async sendSplitQuiz(
    chatId: string,
    quiz: Quiz,
    preparedQuiz: PreparedQuiz,
  ): Promise<string | null> {
    const messageText = this.buildSplitMessage(preparedQuiz);

    // Send question and explanation as HTML formatted message
    await this.telegramClient.sendMessage(chatId, messageText);
    await this.sleep(500);

    // Send poll separately
    console.log('Got here');
    console.log('Is channel', this.isChannel);
    const payload: SendPollPayload = {
      question: LONG_QUIZ_QUESTION,
      options: preparedQuiz.hasLongOption
        ? preparedQuiz.shortPollOptions
        : preparedQuiz.originalOptions,
      type: "quiz",
      correct_option_id: quiz.correctAnswerId,
      is_anonymous: this.isChannel,
      allows_multiple_answers: false,
    };

    const response = (await this.telegramClient.sendPoll(
      chatId,
      payload,
    )) as TelegramSendPollResponse;
    LoggerService.debug(`Split quiz sent: ${quiz.question}`);

    return response?.result?.poll?.id || null;
  }

  /**
   * Build HTML formatted message for split quiz format
   */
  private buildSplitMessage(preparedQuiz: PreparedQuiz): string {
    const question = escapeHtml(preparedQuiz.question);

    const explanation = preparedQuiz.explanation
      .split("\n")
      .map(
        (line: string) => `<span class="tg-spoiler">${escapeHtml(line)}</span>`,
      )
      .join("\n");

    const optionsBlock = preparedQuiz.hasLongOption
      ? `\n\nOptions:\n${preparedQuiz.numberedOptions
          .map((option: string) => escapeHtml(option))
          .join("\n")}`
      : "";

    return `<b>${question}</b>${optionsBlock}\n\n<b>Solution:</b>\n${explanation}`;
  }

  private validateQuiz(quiz: Quiz): void {
    if (!quiz.question) {
      throw new Error("Quiz question is required");
    }

    if (!Array.isArray(quiz.options) || quiz.options.length === 0) {
      throw new Error("Quiz must have at least one option");
    }

    if (
      typeof quiz.correctAnswerId !== "number" ||
      quiz.correctAnswerId < 0 ||
      quiz.correctAnswerId >= quiz.options.length
    ) {
      throw new Error(
        `Invalid correctAnswerId: must be between 0 and ${quiz.options.length - 1}`,
      );
    }
  }

  /**
   * Parse retry_after from Telegram API error response
   */
  private parseRetryAfter(error: TelegramApiError): number {
    const retryAfter = error.response?.data?.parameters?.retry_after;

    if (typeof retryAfter === "number" && retryAfter > 0) {
      return retryAfter;
    }

    if (typeof retryAfter === "string") {
      const parsed = Number(retryAfter);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const description = String(error.response?.data?.description || "");
    const match = description.match(/retry after\s+(\d+)/i);
    if (match && match[1]) {
      const parsed = Number(match[1]);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return 20; // Default fallback
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
