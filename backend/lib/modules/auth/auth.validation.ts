import { z } from "zod";

export class AuthValidationSchema {
  public static signIn = z.object({
    chatId: z
      .union([z.string(), z.number()])
      .transform((value) => String(value).trim())
      .pipe(z.string().min(1, "chatId is required")),
    botToken: z.string().trim().min(1, "botToken is required"),
    isChannel: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((value) => {
        if (value === undefined) {
          return true;
        }

        if (typeof value === "string") {
          return value.toLowerCase() === "true";
        }

        return Boolean(value);
      }),
  });
}
