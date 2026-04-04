const axios = require("axios");

const verifyBotToken = async (botToken) => {
  const normalizedBotToken = String(botToken || "").trim();

  if (!normalizedBotToken) {
    throw new Error("botToken is required");
  }

  const baseUrl = `https://api.telegram.org/bot${normalizedBotToken}`;
  const response = await axios.get(`${baseUrl}/getMe`);
  return response.data;
};

module.exports = {
  verifyBotToken,
};
