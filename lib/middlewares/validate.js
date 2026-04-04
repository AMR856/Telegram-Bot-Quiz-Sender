import { HttpStatusMessages } from "../models/httpStatusMessages";

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) res.locals.body = schema.body.parse(req.body);
    if (schema.params) res.locals.params = schema.params.parse(req.params);
    if (schema.query) res.locals.query = schema.query.parse(req.query);

    next();
  } catch (err) {
    return res.status(400).json({
      status: HttpStatusMessages.FAIL,
      message: err.errors?.[0]?.message || "Validation error",
    });
  }
};
