// src/modules/user/auth/auth.controller.ts
import { Request } from "express";
import { RequestWithUser } from "@modules/core/types/auth";
import { AuthService } from "@modules/user/auth/auth.service";
import {
  RegisterDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  OauthAuthorizeQuery,
  OauthCallbackGetQuery,
  OauthCallbackPostBody,
  OauthDirectBody,
} from "@modules/user/auth/auth.validation";
import { asyncHandler } from "@utils/common/asyncHandler";
import { isAuthProviderKey } from "@constants/auth/providers";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import { successResponse } from "@utils/common/response";
import {
  getEnabledAuthProviders,
  getOAuthClientConfig,
} from "@modules/user/auth/auth.config";

const authService = new AuthService();

/* -------------------------- OAuth callbacks -------------------------- */

// GET or POST /api/auth/oauth/:provider/callback
export const oauthCallback = asyncHandler<Request>(async (req, res) => {
  const { provider } = req.params;
  if (!isAuthProviderKey(provider) || provider === "email") {
    throw new AppError(messages.auth.invalidProvider, 400);
  }

  // Use Zod-derived DTOs for GET and POST
  const q: OauthCallbackGetQuery | OauthCallbackPostBody =
    req.method === "GET"
      ? (req.query as OauthCallbackGetQuery)
      : (req.body as OauthCallbackPostBody);

  const code = q.code || (req.body as any)?.code;
  if (!code) {
    throw new AppError(messages.auth.missingToken, 400, {
      reason: "code_required",
    });
  }

  const result = await authService.oauthLoginWithCode(
    {
      provider,
      code,
      redirect_uri: q.redirect_uri, // optional exact redirect_uri for token exchange
      state: q.state,
      locale: (req as any).i18n?.language,
      theme: q.theme,
    },
    req as any,
    res,
  );

  const target = authService.extractSafeRedirect({
    redirect: q.redirect,
    state: q.state,
  });
  if (!target) return res.status(200).json(result);
  return res.redirect(target);
});

// GET /api/auth/oauth/:provider/authorize
export const oauthAuthorize = asyncHandler<Request>(async (req, res) => {
  const { provider } = req.params;
  if (!isAuthProviderKey(provider) || provider === "email") {
    throw new AppError(messages.auth.invalidProvider, 400);
  }

  const q = req.query as OauthAuthorizeQuery;

  const url = await authService.getAuthorizationUrl(provider, {
    // redirect: q.redirect, // final front-end URL encoded into state
    // scope: q.scope ? q.scope.split(" ") : undefined,
    // code_challenge: q.code_challenge,
    // code_challenge_method: q.code_challenge_method,
    // prompt: q.prompt,
    // access_type: q.access_type,
    // extra params could be passed via service if needed
  });

  res.status(200).json({ url });
});

// POST /api/auth/oauth/:provider
export const oauthLogin = asyncHandler<RequestWithUser>(async (req, res) => {
  const { provider } = req.params;
  if (!isAuthProviderKey(provider) || provider === "email") {
    throw new AppError(messages.auth.invalidProvider, 400);
  }

  const body = req.body as OauthDirectBody;

  if (body.idToken) {
    const result = await authService.oauthLogin(
      {
        provider,
        idToken: body.idToken,
        intent: body.intent,
        locale: (req as any).i18n?.language,
        theme: body.theme,
      },
      req,
      res,
    );
    return res.status(200).json(result);
  }

  if (body.code) {
    const result = await authService.oauthLoginWithCode(
      {
        provider,
        code: body.code,
        redirect_uri: body.redirect_uri,
        state: (req.query?.state as string | undefined) ?? undefined,
        intent: body.intent,
        locale: (req as any).i18n?.language,
        code_verifier: body.code_verifier,
        theme: body.theme,
      },
      req,
      res,
    );
    return res.status(200).json(result);
  }

  throw new AppError(messages.auth.missingToken, 400, {
    reason: "idToken_or_code_required",
  });
});

/* ----------------------- Credentials + tokens ----------------------- */

export const register = asyncHandler<RequestWithUser>(async (req, res) => {
  const body = req.body as RegisterDTO;
  const result = await authService.register(body, req, res, req.file ?? undefined);
  res.status(201).json(result);
});

export const login = asyncHandler<RequestWithUser>(async (req, res) => {
  const body = req.body as LoginDTO;
  const result = await authService.login(body, req, res);
  res.status(200).json(result);
});

export const refresh = asyncHandler<RequestWithUser>(async (req, res) => {
  const result = await authService.refresh(req, res);
  res.status(200).json(result);
});

export const logout = asyncHandler<RequestWithUser>(async (req, res) => {
  await authService.logout(req, res);
  res.status(204).send();
});

export const forgotPassword = asyncHandler<Request>(async (req, res) => {
  const body = req.body as ForgotPasswordDTO;
  await authService.forgotPassword(body);

  return successResponse(
    res,
    {},
    req.t ? req.t(messages.auth.resetEmailSent) : messages.auth.resetEmailSent,
  );
});

export const resetPassword = asyncHandler<Request>(async (req, res) => {
  const body = req.body as ResetPasswordDTO;
  await authService.changePassword({
    token: body.token,
    newPassword: body.newPassword,
  });
  return successResponse(
    res,
    {},
    req.t
      ? req.t(messages.auth.passwordChangedSuccess)
      : messages.auth.passwordChangedSuccess,
  );
});

export const getAuthConfig = asyncHandler<Request>(async (_req, res) => {
  const enabledProviders = getEnabledAuthProviders();
  const oauth = getOAuthClientConfig();
  res.status(200).json({ enabledProviders, oauth });
});
