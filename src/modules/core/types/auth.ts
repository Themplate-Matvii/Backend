// src/types/auth.ts
import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
import { RoleKey } from "@constants/permissions/roles";
import { PlanKey } from "@constants/payments/plans";
import { Readable } from "stream";

export type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream?: Readable;
  destination?: string;
  filename?: string;
  path?: string;
};


// Extend Express Request with JWT payload
export interface RequestWithUser extends Request {
  user?: JwtPayload & {
    sub: string; // userId
    role: RoleKey; // system role
    plan?: PlanKey; // subscription plan
  };
  file?: MulterFile;
  files?: MulterFile[] | Record<string, MulterFile[]>;
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
