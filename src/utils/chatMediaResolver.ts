export class ChatFolderResolver {
  public static resolveFolderName(chatId: string | number | undefined): string {
    return String(chatId || "")
      .trim()
      .replace(/-/g, "");
  }

  // Instance method version for compatibility
  public resolveFolderName(chatId: string | number | undefined): string {
    return ChatFolderResolver.resolveFolderName(chatId);
  }
}