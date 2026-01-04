import jwt from "jsonwebtoken";
import { ENV } from "@config/env";
import { UnsubscribeTokenPayload } from "./email.types";

const TOKEN_TTL = "30d";

export function signUnsubscribeToken(payload: UnsubscribeTokenPayload) {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as UnsubscribeTokenPayload;
  } catch (error) {
    return null;
  }
}
