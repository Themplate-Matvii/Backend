import { Request, Response } from "express";
import { pricingService } from "@modules/billing/pricing/pricing.service";
import { successResponse } from "@utils/common/response";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import { PaymentMode } from "@modules/billing/types";
import { asyncHandler } from "@utils/common/asyncHandler";

export async function getPricingList(req: Request, res: Response) {
  const { mode } = req.query;

  let filterMode: PaymentMode | undefined;

  if (typeof mode === "string") {
    const values = Object.values(PaymentMode) as string[];
    if (values.includes(mode)) {
      filterMode = mode as PaymentMode;
    }
  }

  const result = await pricingService.getAllProducts(
    filterMode ? { mode: filterMode } : undefined,
  );

  return successResponse(res, result);
}

export const getPricingByKey = asyncHandler<Request<{ key: string }>>(
  async (req, res) => {
    const { key } = req.params;
    
    const product = await pricingService.findByKey(key);

    if (!product) {
      throw new AppError(messages.crud.notFound, 404);
    }

    return successResponse(res, product);
  },
);
