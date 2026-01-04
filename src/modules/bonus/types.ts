/**
 * Apply rule:
 * - FIRST      → only first successful payment
 * - RECURRING  → only recurring payments (not the first one)
 * - ALWAYS     → every time
 */
export enum BonusApplyOn {
  FIRST = "first",
  RECURRING = "recurring",
  ALWAYS = "always",
}

/**
 * Models that can receive bonus field increments.
 * Start with User only, extend later if needed.
 */
export enum BonusTargetModel {
  USER = "User",
  // WORKSPACE = "Workspace",
}

/**
 * Bonus configuration entry used in product/plan configs.
 */
export type BonusConfig = {
  model: BonusTargetModel;
  target: "userId"; // extend later if needed
  applyOn: BonusApplyOn;
  fields: Record<string, number>;
};
