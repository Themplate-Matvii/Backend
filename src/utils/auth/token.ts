// src/utils/auth/token.ts
import jwt, { SignOptions } from "jsonwebtoken";
import { ENV } from "@config/env";

export type AccessPayload = {
  sub: string; // userId
  role: string; // system role
  plan?: string; // subscription plan
} & Record<string, any>;

export type RefreshPayload = {
  sub: string; // userId
  jti: string; // unique refresh session id
} & Record<string, any>;

/**
 * Generate access token
 */
export function generateAccessToken(
  payload: AccessPayload,
  expiresIn = ENV.JWT_EXPIRES_IN,
) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, ENV.JWT_SECRET, options);
}

/**
 * Verify access token safely
 */
export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as AccessPayload;
  } catch {
    // you can log or handle token expiration/invalid signature here
    return null;
  }
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  payload: RefreshPayload,
  expiresIn = ENV.JWT_REFRESH_EXPIRES_IN,
) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, options);
}

/**
 * Verify refresh token safely
 */
export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as RefreshPayload;
  } catch {
    return null;
  }
}

/**
 * Sign both access and refresh tokens at once
 */
export function signTokenPair(args: {
  userId: string;
  role: string;
  plan?: string | null;
  jti: string; // unique refresh session id
}) {
  const accessToken = generateAccessToken({
    sub: args.userId,
    role: args.role,
    plan: args.plan || "",
  });

  const refreshToken = generateRefreshToken({
    sub: args.userId,
    jti: args.jti,
  });

  return { accessToken, refreshToken };
}