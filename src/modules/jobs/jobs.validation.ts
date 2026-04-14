import { z } from "zod";

export class JobValidationSchema {
  public static idParam = z.object({
    id: z.string().trim().min(1, "job id is required"),
  });
}
