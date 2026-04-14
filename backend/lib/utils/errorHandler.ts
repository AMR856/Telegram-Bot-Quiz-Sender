import { HTTPStatusText } from "../types/httpStatusText";

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode ?? 500;
  let message = err.message ?? "Internal Server Error";
  let statusText = err.statusText ?? HTTPStatusText.ERROR;

  if (err.name === "ZodError") {
    statusCode = 400;
    const issues = err.issues || err.errors || [];
    message = issues
      .map(
        (errorItem) =>
          `${errorItem.path.join(".") || "request"}: ${errorItem.message}`,
      )
      .join(", ");
    statusText = HTTPStatusText.FAIL;
  }

  if (err.name === "MulterError") {
    statusCode = 400;
    statusText = HTTPStatusText.FAIL;
  }

  const responseBody: {
    status: any;
    message: any;
    details?: unknown;
  } = {
    status: statusText,
    message,
  };

  if (err.details !== undefined) {
    responseBody.details = err.details;
  }

  return res.status(statusCode).json(responseBody);
};
