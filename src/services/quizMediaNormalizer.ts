import { ChatFolderResolver } from "../utils/chatMediaResolver";
import fs from "fs";
import path from "path";

interface NormalizerConfig {
  cloudName?: string;
  chatId?: string | number;
  baseFilePath?: string | null;
}

/**
 * Handles complex path normalization for local files, absolute URLs, and Cloudinary.
 */
export class QuizMediaNormalizer {
  private static readonly CLOUDINARY_HOST_PATTERN = /^(?:https?:\/\/)?(?:res\.)?cloudinary\.com\//i;
  private static readonly CLOUDINARY_PROTOCOL_PREFIX = "https://res.cloudinary.com/";
  private static readonly URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+-.]*:/;
  private static readonly EXPLICIT_RELATIVE_PATTERN = /^(\.\/|\.\.\/)/;

  private readonly cloudName?: string;
  private readonly chatId?: string | number;
  private readonly baseFilePath: string | null;

  constructor({
    cloudName,
    chatId,
    baseFilePath = null,
  }: NormalizerConfig = {}) {
    this.cloudName = cloudName;
    this.chatId = chatId;
    this.baseFilePath = baseFilePath;
  }

  // --- URL & Cloudinary Logic ---

  public isCloudinaryUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string") return false;
    return QuizMediaNormalizer.CLOUDINARY_HOST_PATTERN.test(url);
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith("//res.cloudinary.com/")) {
      return `https:${url}`;
    }
    return url.startsWith("http") ? url : `https://${url}`;
  }

  private buildDeliveryUrl(publicId: string): string {
    if (!publicId || !this.cloudName) return publicId;

    const encodedCloudName = encodeURIComponent(this.cloudName);
    const segments = publicId.split("/").filter(Boolean).map(encodeURIComponent).join("/");

    return `${QuizMediaNormalizer.CLOUDINARY_PROTOCOL_PREFIX}${encodedCloudName}/image/upload/${segments}`;
  }

  // --- Path Resolution ---

  public isAbsoluteUrl(value: string | null | undefined): boolean {
    if (!value || typeof value !== "string") return false;
    return QuizMediaNormalizer.URL_SCHEME_PATTERN.test(value);
  }

  private resolveLocalPath(relative: string): string | null {
    if (!this.baseFilePath) return null;
    const resolved = path.resolve(path.dirname(this.baseFilePath), relative);
    return fs.existsSync(resolved) ? resolved : null;
  }

  // --- Main Orchestration ---

  public normalize(mediaPath: any): any {
    if (!mediaPath || typeof mediaPath !== "string") return mediaPath;

    const trimmed = mediaPath.trim();

    // 1. Cloudinary source
    if (this.cloudName && this.isCloudinaryUrl(trimmed)) {
      return this.normalizeUrl(trimmed);
    }

    // 2. Web or System Absolute
    if (this.isAbsoluteUrl(trimmed) || path.isAbsolute(trimmed)) {
      return trimmed;
    }

    // 3. Local Relative Path
    if (this.baseFilePath) {
      const resolved = this.resolveLocalPath(trimmed);
      if (resolved || QuizMediaNormalizer.EXPLICIT_RELATIVE_PATTERN.test(trimmed)) {
        return resolved || trimmed;
      }
    }

    // 4. Default to Cloudinary Upload mapping
    if (this.cloudName && this.chatId) {
      const folder = ChatFolderResolver.resolveFolderName(this.chatId);
      // Ensure the path is prefixed with the folder correctly
      const publicId = trimmed.startsWith(folder)
        ? trimmed
        : `${folder}/${trimmed.replace(/^\/+/, "")}`;
      return this.buildDeliveryUrl(publicId);
    }

    return trimmed;
  }

  public normalizeQuiz<T extends { photo?: any; image?: any }>(quiz: T): T & { photo: any } {
    const mediaPath = quiz.photo || quiz.image;
    return {
      ...quiz,
      photo: this.normalize(mediaPath),
    };
  }
}