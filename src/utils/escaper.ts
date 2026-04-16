export class Escaper {
  // escapeHtml method to escape special HTML characters in a string to prevent XSS attacks.
  // It replaces &, <, and > with their corresponding HTML entities.
  static escapeHtml = (text: string = ""): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // escapeMarkdownV2 method to escape special characters used in Telegram's MarkdownV2 formatting.
  // It uses a regular expression to find characters that have special meaning in MarkdownV2 and prefixes them with a backslash to escape them.
  static escapeMarkdownV2 = (text: string = ""): string => {
    return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!\\])/g, "\\$1");
  };
}
