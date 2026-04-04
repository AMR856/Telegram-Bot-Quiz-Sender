const EXPLICIT_RELATIVE_PATH_PATTERN = /^(?:\.\/|\.\.\/)/;

const findInvalidRelativeImagePath = (quizzes = []) => {
  for (let index = 0; index < quizzes.length; index += 1) {
    const quiz = quizzes[index] || {};
    const mediaPath = quiz.photo || quiz.image;

    if (
      typeof mediaPath === "string" &&
      EXPLICIT_RELATIVE_PATH_PATTERN.test(mediaPath.trim())
    ) {
      return { index, mediaPath };
    }
  }

  return null;
};

const validateSendQuizzesPayload = (payload = {}) => {
  const { quizzes } = payload;

  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return {
      ok: false,
      status: 400,
      body: { error: "quizzes must be a non-empty array" },
    };
  }

  const invalidRelativePath = findInvalidRelativeImagePath(quizzes);
  if (invalidRelativePath) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Invalid quiz image path",
        details:
          "For API mode, image/photo must be a full URL or a Cloudinary public ID/path. Local relative paths like ./ or ../ are only supported in file-based legacy send-all mode.",
        index: invalidRelativePath.index,
        image: invalidRelativePath.mediaPath,
      },
    };
  }

  return { ok: true };
};

module.exports = {
  validateSendQuizzesPayload,
};
