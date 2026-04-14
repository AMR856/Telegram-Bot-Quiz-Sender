export interface MongoUser {
  _id?: string;
  id: string;
  apiKey: string;
  chatId: string;
  botTokenEncrypted: string;
  isChannel: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  chatId: string;
  isChannel: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedUser extends PublicUser {
  apiKey: string;
  botToken: string;
}

export interface UserSignInOrUpsertParams {
  chatId: unknown;
  botToken: unknown;
  isChannel?: boolean;
}

export interface SignInResponse {
  user: PublicUser;
  apiKey: string;
}

export interface SignInUserParams {
  chatId: string | number;
  botToken: string;
  isChannel?: boolean;
}

export interface SignInUserResult {
  user: PublicUser;
  apiKey: string;
  cloudinaryFolder: string;
}
