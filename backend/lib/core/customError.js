const HttpStatusMessages = require("./httpStatusMessages");

class CustomError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message || "Internal Server Error");
    this.name = "CustomError";
    this.statusCode = statusCode || 500;
    this.statusText =
      options.statusText ||
      (this.statusCode >= 500
        ? HttpStatusMessages.ERROR
        : HttpStatusMessages.FAIL);
    this.details = options.details;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

module.exports = {
  CustomError
};


// ├── core/                      # RENAMED from models/
// │   ├── customError.js
// │   ├── httpStatusMessages.js
// │   └── escaper.js
// ├── services/                  # NEW: Standalone utilities
// │   ├── normalizers.js
// │   ├── botTokenCipher.js
// │   └── parseQuizzes.js
// ├── logging/                   # ✅ Keep as is
// ├── middlewares/               # ✅ Keep as is
// ├── modules/                   # ✅ Keep structure, add stores
// │   └── quizzes/
// │       ├── quizzes.controller.js
// │       ├── quizzes.service.js
// │       ├── quizzes.store.js   # NEW
// │       ├── quizzes.validation.js
// │       ├── quizzes.route.js
// │       └── quizzes.job.service.js
// ├── stores/                    # Keep generic stores (userStore, auditStore)
// └── utils/                     # Keep for small helpers
//     └── errorHandler.js