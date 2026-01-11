import { asyncHandler } from "@utils/common/asyncHandler";
import { RequestWithUser } from "@modules/core/types/auth";
import { AccountService } from "@modules/user/account/account.service";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@modules/user/auth/auth.service";
import {
  UpdateProfileDTO,
  OauthLinkDTO,
  UnlinkProviderDTO,
  EmailStartDTO,
  EmailConfirmDTO,
  PasswordSetDTO,
  VerificationConfirmDTO,
  PasswordChangeDTO,
  EmailChangeStartDTO,
  EmailChangeConfirmDTO,
} from "@modules/user/account/account.validation";

const accountService = new AccountService();

export const getAccountMe = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const data = await accountService.getMe(userId);
  res.status(200).json(data);
});

export const updateProfile = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const data = req.body as UpdateProfileDTO;
  const result = await accountService.updateProfile(userId, data);
  res.status(200).json(result);
});

export const linkOauthProvider = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as OauthLinkDTO;
  const result = await accountService.linkOauthProvider(userId, body);
  res.status(200).json(result);
});

export const unlinkProvider = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const params = req.params as UnlinkProviderDTO;
  const result = await accountService.unlinkProvider(userId, params.provider);
  res.status(200).json(result);
});

export const startEmailLink = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as EmailStartDTO;
  const result = await accountService.startEmailLink(userId, body.email);
  res.status(200).json(result);
});

export const confirmEmailLink = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as EmailConfirmDTO;
  const result = await accountService.confirmEmailLink(userId, body.email, body.code);
  res.status(200).json(result);
});

export const setPassword = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as PasswordSetDTO;
  const result = await accountService.setPassword(userId, body.newPassword);
  res.status(200).json(result);
});

export const sendEmailVerification = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const result = await accountService.sendEmailVerification(userId);
  res.status(200).json(result);
});

export const confirmEmailVerification = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as VerificationConfirmDTO;
  const result = await accountService.confirmEmailVerification(userId, body.code);
  res.status(200).json(result);
});

export const changePassword = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as PasswordChangeDTO;
  const result = await accountService.changePassword(
    userId,
    body.currentPassword,
    body.newPassword,
  );
  res.status(200).json(result);
});

export const startEmailChange = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as EmailChangeStartDTO;
  const result = await accountService.startEmailChange(userId, body.newEmail);
  res.status(200).json(result);
});

export const confirmEmailChange = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  const body = req.body as EmailChangeConfirmDTO;
  const result = await accountService.confirmEmailChange(userId, body.newEmail, body.code);
  res.status(200).json(result);
});

export const deleteAccount = asyncHandler<RequestWithUser>(async (req, res) => {
  const userId = req.user?.sub as string;
  await accountService.scheduleDeletion(userId);
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.status(202).json({ status: "scheduled" });
});
