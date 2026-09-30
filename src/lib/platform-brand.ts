// ─── Identité de la PLATEFORME (hajj-e) ──────────────────────────────────────
//
// Source unique du nom de la plateforme : emails, SMS et pieds de page.
// Surchargeable sans toucher au code :
//   NEXT_PUBLIC_PLATFORM_NAME="hajj-e.com"
//
// ⚠️ Ne PAS confondre avec le nom d'une AGENCE (Tenant.name) : les messages
// destinés aux pèlerins restent signés au nom de leur agence, seul ce qui
// engage la plateforme (création d'agence, mentions légales des emails
// automatiques) utilise ce nom-ci.

export const PLATFORM_NAME =
  (process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "").trim() || "hajj-e.com";
