export class Escaper {
  static escapeHtml = (text: string = ""): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };
  static escapeMarkdownV2 = (text: string = ""): string => {
    return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!\\])/g, "\\$1");
  };
}
