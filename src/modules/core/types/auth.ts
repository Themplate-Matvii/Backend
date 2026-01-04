// src/types/auth.ts
import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
import { RoleKey } from "@constants/permissions/roles";
import { PlanKey } from "@constants/payments/plans";

// Extend Express Request with JWT payload
export interface RequestWithUser extends Request {
  user?: JwtPayload & {
    sub: string; // userId
    role: RoleKey; // system role
    plan?: PlanKey; // subscription plan
  };
}

// OAuth claims returned by provider (OpenID Connect)
export interface OAuthClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

// Query for init endpoint
export interface OAuthInitQuery {
  redirectUri: string;
}

// Query for callback endpoint
export interface OAuthCallbackQuery {
  code: string;
  state: string;
}
