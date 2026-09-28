import "server-only";
import { isMailConfigured, sendNotificationEmail } from "@/lib/mail";
import { normalizePhone } from "@/lib/sms";
import { deliverSms } from "@/lib/sms-service";
import { isDeliverableEmail, isNigerNumber } from "@/lib/phone";

// ─── Notification de création d'agence (plateforme → agence) ─────────────────
//
// Déclenchée par le superadmin juste après la création d'une agence :
//   · EMAIL à l'adresse de l'agence (repli : celle de l'admin) si le SMTP est
//     configuré — contient le lien de connexion et les identifiants ;
//   · SMS au numéro de l'agence s'il est au NIGER (+227) — règle de la
//     plateforme : les SMS ne partent que vers le +227 (voir deliverSms).
//
// Best-effort : un échec d'envoi ne fait JAMAIS échouer la création. Les deux
// canaux sont indépendants ; quand l'un est indisponible (pas de numéro, pays
// hors Niger, SMTP absent), la raison est renvoyée pour être affichée au
// superadmin. Le SMS est journalisé dans `SmsMessage` (suivi/crédits).

export type NotifyChannel = {
  status: "SENT" | "SKIPPED" | "FAILED";
  /** Destinataire réellement utilisé (ou visé). */
  to: string | null;
  /** Raison quand le canal n'a pas pu envoyer. */
  error?: string;
};

export type AgencyCreatedNotification = {
  email: NotifyChannel;
  sms: NotifyChannel;
};

export async function notifyAgencyCreated(opts: {
  tenant: { id: string; name: string; email?: string | null; phone?: string | null };
  admin: { name: string; email: string };
  /** Mot de passe choisi par le superadmin (communiqué à l'agence). */
  adminPassword: string;
  /** Base publique (NEXT_PUBLIC_APP_URL) pour construire le lien de connexion. */
  appUrl?: string | null;
}): Promise<AgencyCreatedNotification> {
  const base = String(opts.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const loginUrl = `${base}/agency-admin/login`;

  const emailText = [
    `Bonjour ${opts.admin.name},`,
    ``,
    `Votre espace agence « ${opts.tenant.name} » vient d'être créé sur la plateforme.`,
    ``,
    `Lien de connexion : ${loginUrl}`,
    `Identifiant : ${opts.admin.email}`,
    `Mot de passe : ${opts.adminPassword}`,
    ``,
    `Nous vous recommandons de modifier ce mot de passe après votre première connexion.`,
    ``,
    `— La plateforme Hajj & Oumra`,
  ].join("\n");

  // SMS : texte sans accents composés → reste en GSM-7 (moins de segments facturés)
  const smsBody =
    `${opts.tenant.name} : votre espace agence est pret. ` +
    `${loginUrl} - identifiant ${opts.admin.email} - mot de passe ${opts.adminPassword}`;

  // ── Canal 1 : EMAIL (agence, sinon admin) ─────────────────────────────────
  const agencyEmail = String(opts.tenant.email ?? "").trim();
  const adminEmail = String(opts.admin.email ?? "").trim();
  const emailTo = isDeliverableEmail(agencyEmail)
    ? agencyEmail
    : isDeliverableEmail(adminEmail)
      ? adminEmail
      : null;

  let email: NotifyChannel;
  if (!emailTo) {
    email = { status: "SKIPPED", to: null, error: "Aucune adresse email exploitable" };
  } else if (!isMailConfigured()) {
    email = { status: "SKIPPED", to: emailTo, error: "SMTP non configuré (SMTP_USER / SMTP_APP_PASSWORD)" };
  } else {
    try {
      await sendNotificationEmail({
        to: emailTo,
        userName: opts.admin.name,
        tenantName: opts.tenant.name,
        subject: "Votre espace agence est prêt",
        text: emailText,
      });
      email = { status: "SENT", to: emailTo };
    } catch (err) {
      email = {
        status: "FAILED",
        to: emailTo,
        error: err instanceof Error ? err.message : "Erreur d'envoi de l'email",
      };
    }
  }

  // ── Canal 2 : SMS (Niger uniquement) ─────────────────────────────────────
  const rawPhone = String(opts.tenant.phone ?? "").trim();
  let sms: NotifyChannel;
  if (!rawPhone) {
    sms = { status: "SKIPPED", to: null, error: "Aucun numéro renseigné pour l'agence" };
  } else if (!isNigerNumber(normalizePhone(rawPhone))) {
    sms = { status: "SKIPPED", to: rawPhone, error: "SMS réservé aux numéros du Niger (+227)" };
  } else {
    const res = await deliverSms({
      tenantId: opts.tenant.id,
      recipient: { name: opts.admin.name, phone: rawPhone },
      body: smsBody,
      source: "ACCOUNT",
      tenantName: opts.tenant.name,
    });
    sms = { status: res.status, to: res.to ?? rawPhone, ...(res.error ? { error: res.error } : {}) };
  }

  return { email, sms };
}
