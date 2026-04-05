const HttpMessages = require("../core/httpStatusMessages");
const { CustomError } = require("../core/customError");

const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) res.locals.body = schema.body.parse(req.body);
    if (schema.params) res.locals.params = schema.params.parse(req.params);
    if (schema.query) res.locals.query = schema.query.parse(req.query);
    if (schema.file) res.locals.file = schema.file.parse(req.file);
    if (schema.files) res.locals.files = schema.files.parse(req.files);

    next();
  } catch (err) {
    next(
      new CustomError(400, err.errors?.[0]?.message || "Validation error", {
        statusText: HttpMessages.FAIL,
      }),
    );
  }
};

module.exports = { validate };
