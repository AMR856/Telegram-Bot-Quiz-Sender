const HttpMessages = require("../../models/httpStatusMessages");

class HealthController {
  static health(req, res) {
    res.status(200).json({
      status: HttpMessages.SUCCESS,
      data : "ok"
    });
  }
}

module.exports = {
  HealthController,
};
