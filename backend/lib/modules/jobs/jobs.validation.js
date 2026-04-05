const { z } = require("zod");

class JobValidationSchema {
  static idParam = z.object({
    id: z.string().trim().min(1, "job id is required"),
  });
}

module.exports = {
  JobValidationSchema,
};
