const { Escaper } = require("../core/escaper");
const { logger } = require("../logging/logger");

const { escapeMarkdownV2, escapeHtml } = Escaper;

const POLL_QUESTION_CHAR_LIMIT = 300;
const POLL_EXPLANATION_CHAR_LIMIT = 200;
const POLL_OPTION_CHAR_LIMIT = 100;
const LONG_QUIZ_QUESTION = "Answer for the above question";
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

class QuizSender {
  constructor({ telegramClient }) {
    this.telegramClient = telegramClient;
  }

  async sendQuiz(chatId, quiz) {
    const preparedQuiz = this.#prepareQuiz(quiz);
    const quizPhoto = quiz.photo || quiz.image;

    if (quizPhoto) {
      await this.telegramClient.sendPhoto(chatId, quizPhoto);
      await this.#sleep(500);
    }

    if (preparedQuiz.needsSplitMessage) {
      await this.#sendSplitQuiz(chatId, quiz, preparedQuiz);
      return;
    }

    await this.#sendInlineQuiz(chatId, quiz, preparedQuiz);
  }

  async sendAll(chatId, quizzes, { delayMs = 2000, onSuccess, onFailure } = {}) {
    logger.info(`Starting to send ${quizzes.length} quizzes`);

    for (let index = 0; index < quizzes.length; index += 1) {
      let sent = false;

      while (!sent) {
        try {
          await this.sendQuiz(chatId, quizzes[index]);

          if (onSuccess) {
            await onSuccess(index);
          }

          sent = true;

          if (index < quizzes.length - 1) {
            await this.#sleep(delayMs);
          }
        } catch (error) {
          if (error.response?.status === 429) {
            const retryAfterSeconds =
              Number(error.response?.data?.parameters?.retry_after) || 20;
            logger.warn(
              `Received 429 (Too Many Requests). Waiting ${retryAfterSeconds} seconds before retrying quiz ${index + 1}`,
            );
            await this.#sleep(retryAfterSeconds * 1000);
            continue;
          }

          if (onFailure) {
            await onFailure(index, error);
          }

          sent = true;
        }
      }
    }

    logger.info("All quizzes sent");
  }

  #prepareQuiz(quiz) {
    const question = quiz.question || "";
    const explanation = quiz.explanation || "";
    const options = quiz.options || [];
    const hasLongOption = options.some(
      (option) => (option || "").length > POLL_OPTION_CHAR_LIMIT,
    );

    const markdownSpoilerExplanation = `||${escapeMarkdownV2(explanation)}||`;
    const canInlineExplanation =
      markdownSpoilerExplanation.length <= POLL_EXPLANATION_CHAR_LIMIT &&
      question.length <= POLL_QUESTION_CHAR_LIMIT &&
      !hasLongOption;

    return {
      canInlineExplanation,
      hasLongOption,
      question,
      explanation,
      markdownSpoilerExplanation,
      numberedOptions: options.map((option, index) => {
        const label = OPTION_LABELS[index] || String(index + 1);
        return `${label}- ${option}`;
      }),
      shortPollOptions: options.map((_, index) => {
        const label = OPTION_LABELS[index] || String(index + 1);
        return `${label}.`;
      }),
      needsSplitMessage: !canInlineExplanation,
      originalOptions: options,
    };
  }

  async #sendInlineQuiz(chatId, quiz, preparedQuiz) {
    await this.telegramClient.sendPoll(chatId, {
      question: quiz.question,
      options: preparedQuiz.originalOptions,
      type: "quiz",
      correct_option_id: quiz.correctAnswerId,
      explanation: preparedQuiz.markdownSpoilerExplanation,
      explanation_parse_mode: "MarkdownV2",
      allows_multiple_answers: false,
    });

    logger.info(`Quiz sent: ${quiz.question}`);
  }

  async #sendSplitQuiz(chatId, quiz, preparedQuiz) {
    const messageText = this.#buildSplitMessage(preparedQuiz);

    await this.telegramClient.sendMessage(chatId, messageText);
    await this.#sleep(500);

    await this.telegramClient.sendPoll(chatId, {
      question: LONG_QUIZ_QUESTION,
      options: preparedQuiz.hasLongOption
        ? preparedQuiz.shortPollOptions
        : preparedQuiz.originalOptions,
      type: "quiz",
      correct_option_id: quiz.correctAnswerId,
      allows_multiple_answers: false,
    });

    logger.info(`Quiz sent as split message: ${quiz.question}`);
  }

  #buildSplitMessage(preparedQuiz) {
    const question = escapeHtml(preparedQuiz.question);
    const explanation = preparedQuiz.explanation
      .split("\n")
      .map((line) => `<span class="tg-spoiler">${escapeHtml(line)}</span>`)
      .join("\n");

    const optionsBlock = preparedQuiz.hasLongOption
      ? `\n\nOptions:\n${preparedQuiz.numberedOptions
          .map((option) => escapeHtml(option))
          .join("\n")}`
      : "";

    return `<b>${question}</b>${optionsBlock}\n\n<b>Solution:</b>\n${explanation}`;
  }

  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = { QuizSender };
