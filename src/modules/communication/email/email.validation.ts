import { z } from "zod";
import { objectIdSchema } from "@modules/core/common.validation";
import { EmailCategory } from "./email.types";
import { LangEnum } from "@config/i18n";

const translationsSchema = z.record(z.string(), z.record(z.string(), z.string()));

const baseTemplatePayload = z.object({
  data: z.record(z.string(), z.any()).optional(),
  locale: z.nativeEnum(LangEnum).optional(),
  category: z.nativeEnum(EmailCategory).optional(),
});

/**
 * Validation: POST /email/send (single email)
 */
export const sendEmailSchema = {
  body: baseTemplatePayload.extend({
    to: z.string().email().optional(),
    userId: objectIdSchema.optional(),
    template: z.string().min(1).optional(),
    subjectKey: z.string().min(1).optional(),
    marketingTemplateId: objectIdSchema.optional(),
  }).refine(
    (body) =>
      Boolean(body.marketingTemplateId) ||
      (Boolean(body.template) && Boolean(body.subjectKey)),
    {
      message: "Provide marketingTemplateId or template with subjectKey",
      path: ["template"],
    },
   ).refine((body) => Boolean(body.to) || Boolean(body.userId), {
     message: "Recipient email or userId is required",
     path: ["to"],
   }),
};
 export type SendEmailDTO = z.infer<typeof sendEmailSchema.body>;
 
 /**
  * Validation: POST /email/broadcast (all users or selected)
  */
 export const broadcastEmailSchema = {
   body: baseTemplatePayload.extend({
     template: z.string().min(1).optional(),
     subjectKey: z.string().min(1).optional(),
     marketingTemplateId: objectIdSchema.optional(),
     userIds: z.array(objectIdSchema).optional(),
   }).refine(
     (body) =>
       Boolean(body.marketingTemplateId) ||
       (Boolean(body.template) && Boolean(body.subjectKey)),
     {
       message: "Provide marketingTemplateId or template with subjectKey",
       path: ["template"],
     },
   ),
 };
 export type BroadcastEmailDTO = z.infer<typeof broadcastEmailSchema.body>;

 /** Branding **/
 export const updateBrandingSchema = {
   body: z.object({
     brandName: z.string().trim().min(1),
     logoMediaId: objectIdSchema.nullable().optional(),
     darkLogoMediaId: objectIdSchema.nullable().optional(),
     primaryColor: z.string().trim().min(1),
     secondaryColor: z.string().trim().optional(),
     accentColor: z.string().trim().min(1),
     backgroundColor: z.string().trim().min(1),
     textColor: z.string().trim().min(1),
     supportEmail: z.string().email().nullable().optional(),
   }),
 };
 export type UpdateBrandingDTO = z.infer<typeof updateBrandingSchema.body>;

 /** Marketing templates **/
export const createMarketingTemplateSchema = {
  body: z.object({
    name: z.string().trim().min(2),
    description: z.string().trim().nullable().optional(),
    subjectKey: z.string().trim().min(1),
    translations: translationsSchema,
    hbs: z.string().trim().min(1),
    previewData: z.record(z.string(), z.any()).optional(),
  }),
};
export type CreateMarketingTemplateDTO = z.infer<
  typeof createMarketingTemplateSchema.body
>;

export const marketingDraftPreviewSchema = {
  body: createMarketingTemplateSchema.body.extend({
    data: z.record(z.string(), z.any()).optional(),
    locale: z.nativeEnum(LangEnum).optional(),
  }),
};
export type MarketingDraftPreviewDTO = z.infer<
  typeof marketingDraftPreviewSchema.body
>;

 export const updateMarketingTemplateSchema = {
   body: z
     .object({
       name: z.string().trim().min(2).optional(),
       description: z.string().trim().nullable().optional(),
       subjectKey: z.string().trim().min(1).optional(),
       translations: translationsSchema.optional(),
       hbs: z.string().trim().min(1).optional(),
       previewData: z.record(z.string(), z.any()).optional(),
     })
     .refine((body) => Object.keys(body).length > 0, {
       message: "No fields to update",
     }),
   params: z.object({ id: objectIdSchema }),
 };
 export type UpdateMarketingTemplateDTO = z.infer<
   typeof updateMarketingTemplateSchema.body
 >;
 export type MarketingTemplateParamsDTO = z.infer<
   typeof updateMarketingTemplateSchema.params
 >;

 export const marketingPreviewSchema = {
   params: z.object({ id: objectIdSchema }),
   body: baseTemplatePayload.extend({
     data: z.record(z.string(), z.any()).optional(),
   }),
 };
 export type MarketingPreviewParamsDTO = z.infer<
   typeof marketingPreviewSchema.params
 >;
 export type MarketingPreviewDTO = z.infer<typeof marketingPreviewSchema.body>;

 export const templatePreviewSchema = {
   body: baseTemplatePayload.extend({
     template: z.string().min(1),
   }),
 };
 export type TemplatePreviewDTO = z.infer<typeof templatePreviewSchema.body>;

 /** Unsubscribe **/
 export const unsubscribeParamsSchema = {
   params: z.object({ token: z.string().min(10) }),
 };
 export type UnsubscribeParamsDTO = z.infer<typeof unsubscribeParamsSchema.params>;

 export const updatePreferencesSchema = {
   params: z.object({ token: z.string().min(10) }),
   body: z.object({
     marketing: z.boolean().optional(),
     billing: z.boolean().optional(),
   }),
 };
 export type UpdatePreferencesDTO = z.infer<
   typeof updatePreferencesSchema.body
 >;
