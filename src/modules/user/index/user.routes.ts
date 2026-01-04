import { Router } from "express";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import {
  getCurrentUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "@modules/user/index/user.controller";
import {
  getAllUsersSchema,
  getUserByIdSchema,
  updateUserSchema,
  deleteUserSchema,
} from "@modules/user/index/user.validation";
import { checkPermission } from "@middleware/checkPermission";
import { requireJwt } from "@middleware/authenticateJwt";
import { validate } from "@middleware/validate";

const router = Router();

/**
 * GET /users/me
 * - Returns current user from token
 */
router.get("/me", requireJwt, getCurrentUser);

/**
 * GET /users/all
 * - Only users with any.view permission can access
 */
router.get(
  "/all",
  requireJwt,
  checkPermission({ any: permissionKeys.users.any.view }),
  validate(getAllUsersSchema),
  getAllUsers,
);

/**
 * GET /users/id/:userId
 * Permissions:
 * - own.view → user can view their own data
 * - any.view → user can view any user
 */
router.get(
  "/id/:userId",
  requireJwt,
  checkPermission({
    own: permissionKeys.users.own.edit,
    any: permissionKeys.users.any.view,
  }),
  validate(getUserByIdSchema),
  getUserById,
);

/**
 * PUT /users/id/:userId
 * Permissions:
 * - own.edit → user can update their own data
 * - any.edit → user can update any user
 */
router.put(
  "/id/:userId",
  requireJwt,
  checkPermission({
    own: permissionKeys.users.own.edit,
    any: permissionKeys.users.any.edit,
  }),
  validate(updateUserSchema),
  updateUser,
);

/**
 * DELETE /users/id/:userId
 * Permissions:
 * - own.delete → user can delete their own account
 * - any.delete → user can delete any user
 */
router.delete(
  "/id/:userId",
  requireJwt,
  checkPermission({
    own: permissionKeys.users.own.delete,
    any: permissionKeys.users.any.delete,
  }),
  validate(deleteUserSchema),
  deleteUser,
);

export default router;
