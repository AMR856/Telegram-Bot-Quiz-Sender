export class ChatFolderResolver {
  // Resolves the folder of the chat in the cloud
  public static resolveFolderName(chatId: string | number | undefined): string {
    return String(chatId || "")
      .trim()
      .replace(/-/g, "");
  }

  // Instance method version for compatibility
  // * Not used currently
  public resolveFolderName(chatId: string | number | undefined): string {
    return ChatFolderResolver.resolveFolderName(chatId);
  }
}