export type UserRole = "SUPER_ADMIN" | "AGENCY_ADMIN" | "AGENCY_AGENT" | "PILGRIM";

export type Permission =
  | "pilgrims:read"   | "pilgrims:write"   | "pilgrims:delete"
  | "reservations:read" | "reservations:write" | "reservations:delete"
  | "offers:read"     | "offers:write"     | "offers:delete"
  | "messages:read"   | "messages:reply"
  | "finances:read"   | "finances:write"
  | "team:read"       | "team:write"
  | "reviews:moderate"
  | "portal:customize"
  | "audit:read";

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";
export type Plan = "STARTER" | "PRO" | "ENTERPRISE";

export type TenantTheme = {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  tagline?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  address?: string;
  features?: {
    coran?: boolean;
    qibla?: boolean;
    guide?: boolean;
    shop?: boolean;
    ticketing?: boolean;
  };
  defaultLocale?: "fr" | "en" | "ar";
};
