const { z } = require("zod");

const EXPLICIT_RELATIVE_PATH_PATTERN = /^(?:\.\/|\.\.\/)/;

class QuizzesValidationSchema {
  static quizSchema = z
    .object({
      question: z.string().trim().min(1, "question is required"),
      options: z
        .array(z.string().trim().min(1, "options cannot contain empty values"))
        .min(2, "options must be a non-empty array with at least 2 items")
        .max(8, "options cannot contain more than 8 items"),
      correctAnswerId: z.coerce
        .number()
        .int("correctAnswerId must be an integer")
        .min(0, "correctAnswerId must be zero or greater"),
      explanation: z.string().trim().optional().default(""),
      image: z.string().trim().optional(),
      photo: z.string().trim().optional(),
    })
    .superRefine((quiz, ctx) => {
      if (quiz.correctAnswerId >= quiz.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctAnswerId"],
          message: "correctAnswerId must point to one of the provided options",
        });
      }

      const mediaPath = quiz.photo || quiz.image;
      if (
        typeof mediaPath === "string" &&
        EXPLICIT_RELATIVE_PATH_PATTERN.test(mediaPath.trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [quiz.photo ? "photo" : "image"],
          message:
            "Local relative paths like ./ or ../ are only supported in file-based legacy send-all mode",
        });
      }
    });

  static sendQuizzesBodySchema = z.object({
    delayMs: z.coerce.number().int().min(0).default(2000),
    quizzes: z
      .array(this.quizSchema)
      .min(1, "quizzes must be a non-empty array"),
  });
}

module.exports = { QuizzesValidationSchema };
