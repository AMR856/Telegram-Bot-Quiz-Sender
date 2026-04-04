const { getHealth } = require("./health.service");
const { sendSuccess } = require("../../utils/httpResponse");

const health = (req, res) => {
  return sendSuccess(res, 200, getHealth());
};

module.exports = {
  health,
};
