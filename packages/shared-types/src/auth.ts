import type { UserType } from "./common";

export interface RequestOtpDto {
  phone: string;
  userType: Extract<UserType, "staff" | "member">;
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
  userType: Extract<UserType, "staff" | "member">;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
  gymId: string | null;
  gyms?: GymOption[];
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role?: string;
  type: UserType;
}

export interface GymOption {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface SelectGymDto {
  gymId: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface PlatformLoginDto {
  email: string;
  password: string;
  totpCode: string;
}

export interface PlatformJwtPayload {
  sub: string;
  userId: string;
  platformRole: string;
  type: "platform";
  iat?: number;
  exp?: number;
}
