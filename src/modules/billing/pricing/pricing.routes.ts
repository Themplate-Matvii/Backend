import { Router } from "express";
import * as pricingController from "@modules/billing/pricing/pricing.controller";

const router = Router();

router.get("/", pricingController.getPricingList);
router.get("/:key", pricingController.getPricingByKey);

export default router;
