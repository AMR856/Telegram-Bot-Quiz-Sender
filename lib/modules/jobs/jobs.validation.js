const { z } = require("zod");

const jobParamsSchema = z.object({
  id: z.string().trim().min(1, "job id is required"),
});

module.exports = {
  jobParamsSchema,
};