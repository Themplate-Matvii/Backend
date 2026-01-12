export enum EmailCategory {
  TRANSACTIONAL = "transactional",
  MARKETING = "marketing",
  BILLING = "billing",
}

export type UnsubscribeScope = EmailCategory.MARKETING | EmailCategory.BILLING;

export interface UnsubscribeTokenPayload {
  userId: string;
  categories: UnsubscribeScope[];
}

export interface EmailBrandingPayload {
  brandName: string;
  logoMediaId?: string | null;
  darkLogoMediaId?: string | null;
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  supportEmail?: string | null;
}
