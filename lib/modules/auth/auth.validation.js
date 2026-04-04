const validateAuthSignInPayload = (payload = {}) => {
  const { chatId, botToken } = payload;

  if (!chatId || !botToken) {
    return {
      ok: false,
      status: 400,
      body: { error: "chatId and botToken are required" },
    };
  }

  return { ok: true };
};

module.exports = {
  validateAuthSignInPayload,
};
