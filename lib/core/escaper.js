class Escaper {
  static escapeHtml = (text = "") => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };
  static escapeMarkdownV2 = (text = "") => {
    return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!\\])/g, "\\$1");
  };
}

module.exports = { Escaper };
