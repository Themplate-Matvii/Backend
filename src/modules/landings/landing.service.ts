import { LandingModel, LandingDocument } from "@modules/landings/landing.model";

class LandingService {
  async createLanding(
    userId: string,
    title: string,
    description?: string,
  ): Promise<LandingDocument> {
    return LandingModel.create({ userId, title, description });
  }

  async getAllLandings(
    scope: "own" | "any",
    userId: string,
  ): Promise<LandingDocument[]> {
    if (scope === "any") {
      return LandingModel.find().sort({ createdAt: -1 });
    }
    return LandingModel.find({ userId }).sort({ createdAt: -1 });
  }
}

export const landingService = new LandingService();
