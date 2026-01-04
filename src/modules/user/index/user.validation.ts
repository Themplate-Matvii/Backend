import { z } from "zod";
import { LangEnum } from "@config/i18n";
import {
  nameSchema,
  objectIdSchema,
  paginationQueryBase,
} from "@modules/core/common.validation";
import { ThemeEnum } from "../settings/types";

const avatarSchema = z
  .union([
    objectIdSchema,
    z.object({ url: z.string().trim().url() }),
  ])
  .nullable()
  .optional();

/**
 * Validation: GET /users/all
 */
export const getAllUsersSchema = {
  query: paginationQueryBase.extend({
    role: z.string().trim().optional(),
    plan: z.string().trim().optional(),
  }),
};
export type GetAllUsersDTO = z.infer<typeof getAllUsersSchema.query>;

/**
 * Validation: PUT /users/id/:userId
 */
export const updateUserSchema = {
  body: z.object({
    name: nameSchema.optional(),
    avatar: avatarSchema,
    settings: z
      .object({
        theme: z.nativeEnum(ThemeEnum).optional(),
        locale: z.enum(LangEnum).optional(),
        emailPreferences: z
          .object({
            marketing: z.boolean().optional(),
            billing: z.boolean().optional(),
          })
          .optional(),
      })
      .partial()
      .optional(),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
};
export type UpdateUserDTO = z.infer<typeof updateUserSchema.body>;
export type UpdateUserParamsDTO = z.infer<typeof updateUserSchema.params>;

/**
 * Validation: DELETE /users/id/:userId
 */
export const deleteUserSchema = {
  params: z.object({
    userId: z.string().min(1),
  }),
};
export type DeleteUserParamsDTO = z.infer<typeof deleteUserSchema.params>;

/**
 * Validation: GET /users/id/:userId
 */
export const getUserByIdSchema = {
  params: z.object({
    userId: z.string().min(1),
  }),
};
export type GetUserByIdParamsDTO = z.infer<typeof getUserByIdSchema.params>;
