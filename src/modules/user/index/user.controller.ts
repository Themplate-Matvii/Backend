import { Request } from "express";
import { RequestWithUser } from "@modules/core/types/auth";
import { UserService } from "@modules/user/index/user.service";
import { asyncHandler } from "@utils/common/asyncHandler";
import { messages } from "@constants/messages";
import { AppError } from "@utils/common/appError";

import {
  GetAllUsersDTO,
  GetUserByIdParamsDTO,
  UpdateUserDTO,
  UpdateUserParamsDTO,
  DeleteUserParamsDTO,
} from "@modules/user/index/user.validation";
import { successResponse } from "@utils/common/response";

const userService = new UserService();

/**
 * GET /users/me
 */
export const getCurrentUser = asyncHandler<RequestWithUser>(
  async (req, res) => {
    if (!req.user) {
      throw new AppError(messages.auth.unauthorized, 401);
    }

    const user = await userService.getCurrent(req.user.sub);

    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId: req.user.sub });
    }

    return successResponse(res, user);
  },
);

/**
 * GET /users/id/:userId
 */
export const getUserById = asyncHandler<Request<{ userId: string }>>(
  async (req, res) => {
    const { userId } = req.params as GetUserByIdParamsDTO;
    const user = await userService.findById(userId);

    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    return successResponse(res, user);
  },
);

/**
 * GET /users/all
 */
export const getAllUsers = asyncHandler<Request>(
  async (req: RequestWithUser, res) => {
    const query = req.query as unknown as GetAllUsersDTO;

    const currentUserId = req.user?.sub;

    const result = await userService.findAll(query, currentUserId);

    return successResponse(res, result);
  },
);

/**
 * PUT /users/id/:userId
 */
export const updateUser = asyncHandler<RequestWithUser>(async (req, res) => {
  const { userId } = req.params as UpdateUserParamsDTO;
  const data = req.body as UpdateUserDTO;

  const updated = await userService.update(userId, data);

  if (!updated) {
    throw new AppError(messages.crud.notFound, 404, { userId });
  }

  return successResponse(res, updated);
});

/**
 * DELETE /users/id/:userId
 */
export const deleteUser = asyncHandler<RequestWithUser>(async (req, res) => {
  const { userId } = req.params as DeleteUserParamsDTO;

  const deleted = await userService.delete(userId);

  if (!deleted) {
    throw new AppError(messages.crud.notFound, 404, { userId });
  }

  return successResponse(res, null);
});
