// ─── Messages de création d'agence (contenu PUR, sans envoi) ─────────────────
//
// Fichier SANS « server-only » : le contenu des messages est testable isolément,
// sans risque d'envoi accidentel. L'expédition (SMTP / SMS) reste dans
// `agency-notify.ts`.

export type AgencyCreatedMessageInput = {
  tenantName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  /** Lien de l'espace de GESTION (admin). */
  loginUrl: string;
  /** Lien du PORTAIL PUBLIC (pèlerins) — omis s'il n'est pas déterminable. */
  publicUrl?: string | null;
};

/** Corps de l'EMAIL envoyé à l'agence (et/ou à son administrateur). */
export function buildAgencyCreatedEmailText(input: AgencyCreatedMessageInput): string {
  const publicUrl = String(input.publicUrl ?? "").trim() || null;

  return [
    `Bonjour ${input.adminName},`,
    ``,
    `Votre espace agence « ${input.tenantName} » vient d'être créé sur la plateforme.`,
    ``,
    // Le site public d'abord : c'est le lien que l'agence partagera à ses pèlerins
    ...(publicUrl ? [`Portail public (pèlerins) : ${publicUrl}`] : []),
    `Espace de gestion : ${input.loginUrl}`,
    ``,
    `Identifiant : ${input.adminEmail}`,
    `Mot de passe : ${input.adminPassword}`,
    ``,
    `IMPORTANT : ce mot de passe est provisoire. Vous devrez impérativement le changer à votre première connexion avant d'accéder à votre espace.`,
    ``,
    `— La plateforme Hajj & Oumra`,
  ].join("\n");
}

/**
 * Corps du SMS. Texte SANS accents composés → reste en GSM-7, donc moins de
 * segments facturés. Contient les DEUX adresses de l'agence.
 */
export function buildAgencyCreatedSmsBody(input: AgencyCreatedMessageInput): string {
  const publicUrl = String(input.publicUrl ?? "").trim() || null;
  const credentials = `identifiant ${input.adminEmail} - mot de passe ${input.adminPassword} (provisoire : changement obligatoire a la premiere connexion)`;

  return publicUrl
    ? `${input.tenantName} est en ligne. Portail public : ${publicUrl} - Gestion : ${input.loginUrl} - ${credentials}`
    : `${input.tenantName} : votre espace agence est pret. ${input.loginUrl} - ${credentials}`;
}
