import { z } from "zod";

const EXPLICIT_RELATIVE_PATH_PATTERN = /^(?:\.\/|\.\.\/)/;

export class QuizzesValidationSchema {
  public static quizSchema = z
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
      image: z.string().trim().optional(), // Image to be uploaded above the question, can be a URL or a local path (for legacy send-all mode)
      photo: z.string().trim().optional(), // The same as before just a different name for user convenience, can be a URL or a local path (for legacy send-all mode)
    })
    .superRefine((quiz, ctx) => {
      // Ensuring that correctAnswerId points to a valid option index
      if (quiz.correctAnswerId >= quiz.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctAnswerId"],
          message: "correctAnswerId must point to one of the provided options",
        });
      }

      // Validating that if an image or photo field is provided, 
      // it should not be a local relative path (starting with ./ or ../) since that is only supported in the legacy send-all mode which reads quizzes from files and can resolve those paths. 
      // In API mode, we expect either absolute URLs or other forms of media references, but not local file paths.
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

  public static sendQuizzesBodySchema = z.object({
    delayMs: z.coerce.number().int().min(0).default(2000),
    quizzes: z
      .array(this.quizSchema)
      .min(1, "quizzes must be a non-empty array"),
  });
}
