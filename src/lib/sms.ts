import "server-only";
import { normalizeE164, SMS_DIAL } from "@/lib/phone";

/**
 * Transport SMS — LAfricaMobile (https://lamsms.lafricamobile.com)
 * Expéditeur « SmartLimb » (nom déjà validé côté LAfricaMobile).
 *
 * Contrat repris à l'identique du service utilisé par Ihambaoba :
 *  - POST /api      → identifiants dans le BODY, réponse = TEXTE BRUT (id message)
 *  - GET  /credits  → réponse = TEXTE BRUT (nombre de crédits restants)
 * Aucune dépendance ajoutée : fetch natif + AbortSignal.timeout.
 */

const DEFAULT_BASE_URL = "https://lamsms.lafricamobile.com";
const TIMEOUT_MS = 15_000;

export type SmsErrorCode =
  | "SMS_DISABLED"
  | "SMS_MISSING_CREDENTIALS"
  | "SMS_INVALID_SENDER"
  | "SMS_MISSING_RECIPIENT"
  | "SMS_EMPTY_TEXT"
  | "SMS_PROVIDER_ERROR"
  | "SMS_CREDITS_ERROR";

export class SmsError extends Error {
  code: SmsErrorCode;
  status?: number;
  providerBody?: unknown;

  constructor(code: SmsErrorCode, message: string, extra?: { status?: number; providerBody?: unknown }) {
    super(message);
    this.name = "SmsError";
    this.code = code;
    this.status = extra?.status;
    this.providerBody = extra?.providerBody;
  }
}

export type SmsConfig = {
  accountId: string;
  password: string;
  sender: string;
  baseUrl: string;
  enabled: boolean;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSmsConfig(): SmsConfig {
  return {
    accountId: process.env.LAFRICA_SMS_ACCOUNT_ID || process.env.ACCESS_KEY_AFRICAMOBILE || "",
    password: process.env.LAFRICA_SMS_PASSWORD || process.env.ACCESS_PASSWORD_AFRICAMOBILE || "",
    sender: (process.env.LAFRICA_SMS_SENDER || "SmartLimb").trim(),
    baseUrl: trimTrailingSlash(process.env.LAFRICA_SMS_BASE_URL || DEFAULT_BASE_URL),
    enabled: String(process.env.LAFRICA_SMS_ENABLED || "false").toLowerCase() === "true",
  };
}

/** L'expéditeur doit être ≤ 11 car., sans chiffre au début, [A-Za-z0-9_] uniquement. */
export function isSenderValid(sender: string): boolean {
  if (!sender) return false;
  if (/^\d/.test(sender)) return false;
  if (sender.length > 11) return false;
  return /^[A-Za-z0-9_]+$/.test(sender);
}

/** true si l'envoi est activé ET correctement configuré (sans lever d'erreur). */
export function isSmsConfigured(): boolean {
  const config = getSmsConfig();
  return config.enabled && !!config.accountId && !!config.password && isSenderValid(config.sender);
}

/**
 * Vérifie que l'envoi est possible et retourne la configuration validée.
 * (Identifiants utilisés uniquement côté serveur, jamais exposés.)
 */
export function assertReady(): SmsConfig {
  const config = getSmsConfig();

  if (!config.enabled) {
    throw new SmsError("SMS_DISABLED", "Envoi SMS désactivé (LAFRICA_SMS_ENABLED=false)");
  }
  if (!config.accountId || !config.password) {
    throw new SmsError("SMS_MISSING_CREDENTIALS", "Identifiants LAfricaMobile manquants");
  }
  if (!isSenderValid(config.sender)) {
    throw new SmsError(
      "SMS_INVALID_SENDER",
      "Expéditeur SMS invalide (11 caractères max, sans chiffre au début)"
    );
  }

  return config;
}

/**
 * Normalise un numéro au format international attendu par LAfricaMobile
 * (« +22789123456 »). Délègue à `normalizeE164` (src/lib/phone.ts) : la
 * modération est ainsi IDENTIQUE partout — stockage, affichage et envoi.
 */
export function normalizePhone(raw?: string | null): string | null {
  return normalizeE164(raw, {
    defaultDial: process.env.SMS_DEFAULT_COUNTRY?.replace(/\D/g, "") || SMS_DIAL,
  });
}

// Comptage de segments + formatage : définis dans `sms-segments.ts` (sans
// « server-only ») pour être utilisables aussi par les composants client.
export { countSmsSegments, formatPhone } from "@/lib/sms-segments";

/** Message d'erreur lisible (pour affichage agrégé dans l'UI). */
export function smsErrorMessage(err: unknown): string {
  if (err instanceof SmsError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erreur inconnue";
}

/** Envoi d'un SMS. Retourne l'id message fourni par l'opérateur. */
export async function sendSms({
  to,
  text,
  retId,
  retUrl,
}: {
  to: string;
  text: string;
  retId?: string;
  retUrl?: string;
}): Promise<{ providerMessageId: string; raw: string }> {
  const config = assertReady();
  const recipient = normalizePhone(to);
  const content = String(text ?? "").trim();

  if (!recipient) {
    throw new SmsError("SMS_MISSING_RECIPIENT", "Destinataire SMS manquant ou invalide");
  }
  if (!content) {
    throw new SmsError("SMS_EMPTY_TEXT", "Contenu SMS vide");
  }

  const payload: Record<string, string> = {
    accountid: config.accountId,
    password: config.password,
    sender: config.sender,
    text: content,
    to: recipient,
  };
  if (retId) payload.ret_id = String(retId);
  if (retUrl) payload.ret_url = String(retUrl);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain, application/json, */*",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new SmsError(
      "SMS_PROVIDER_ERROR",
      `Fournisseur SMS injoignable (${err instanceof Error ? err.message : "erreur réseau"})`
    );
  }

  const raw = (await response.text().catch(() => "")).trim();

  if (!response.ok) {
    throw new SmsError("SMS_PROVIDER_ERROR", `Erreur fournisseur SMS (HTTP ${response.status})`, {
      status: response.status,
      providerBody: raw,
    });
  }

  return { providerMessageId: raw, raw };
}

/** Crédits restants chez LAfricaMobile (réponse texte de l'opérateur). */
export async function checkCredits(): Promise<{
  credits: number | null;
  total: number | null;
  routes: SmsCreditRoute[];
  raw: string;
}> {
  const config = assertReady();
  const url =
    `${config.baseUrl}/credits?accountid=${encodeURIComponent(config.accountId)}` +
    `&password=${encodeURIComponent(config.password)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/plain, application/json, */*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new SmsError(
      "SMS_CREDITS_ERROR",
      `Crédits SMS injoignables (${err instanceof Error ? err.message : "erreur réseau"})`
    );
  }

  const raw = (await response.text().catch(() => "")).trim();

  if (!response.ok) {
    throw new SmsError("SMS_CREDITS_ERROR", `Erreur crédits SMS (HTTP ${response.status})`, {
      status: response.status,
      providerBody: raw,
    });
  }

  const parsed = parseCredits(raw);
  return { credits: parsed.credits, raw, routes: parsed.routes, total: parsed.total };
}

// ─── Analyse de la réponse « crédits » ────────────────────────────────────────
//
// L'opérateur répond en XML (un bloc <route> par type d'envoi) :
//   <credits><route><type>International</type><credits>300</credits>
//            <credits_month>300</credits_month></route>…</credits>
// Certains comptes répondent simplement « 300 ». On gère les trois formats.

export type SmsCreditRoute = { type: string; credits: number; creditsMonth: number | null };

export type ParsedCredits = {
  /** Crédits de la route la plus pertinente (International si présente). */
  credits: number | null;
  /** Somme des crédits de toutes les routes (null si non applicable). */
  total: number | null;
  routes: SmsCreditRoute[];
  raw: string;
};

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export function parseCredits(raw: string): ParsedCredits {
  const text = String(raw ?? "").trim();
  if (!text) return { credits: null, total: null, routes: [], raw: text };

  // 1. JSON : { credits: 300 } | { routes: [{ type, credits }] } | [{ type, credits }]
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const data: unknown = JSON.parse(text);
      const list = Array.isArray(data)
        ? data
        : typeof data === "object" && data !== null
          ? ((data as { routes?: unknown[] }).routes ?? [data])
          : [];
      const routes: SmsCreditRoute[] = [];
      for (const item of list) {
        if (typeof item !== "object" || item === null) continue;
        const row = item as Record<string, unknown>;
        const credits = toNumber(String(row.credits ?? row.credit ?? ""));
        if (credits === null) continue;
        routes.push({
          type: String(row.type ?? row.route ?? ""),
          credits,
          creditsMonth: toNumber(String(row.credits_month ?? row.creditsMonth ?? "")),
        });
      }
      if (routes.length) {
        const preferred = routes.find((r) => /international/i.test(r.type)) ?? routes[0];
        return {
          credits: preferred.credits,
          total: routes.reduce((sum, r) => sum + r.credits, 0),
          routes,
          raw: text,
        };
      }
    } catch {
      // pas du JSON exploitable → on continue
    }
  }

  // 2. XML : un bloc <route> par type d'envoi
  const routes: SmsCreditRoute[] = [];
  for (const block of text.match(/<route>[\s\S]*?<\/route>/gi) ?? []) {
    const credits = toNumber(block.match(/<credits>([^<]*)<\/credits>/i)?.[1]);
    if (credits === null) continue;
    routes.push({
      type: block.match(/<type>([^<]*)<\/type>/i)?.[1]?.trim() ?? "",
      credits,
      creditsMonth: toNumber(block.match(/<credits_month>([^<]*)<\/credits_month>/i)?.[1]),
    });
  }
  if (routes.length) {
    const preferred = routes.find((r) => /international/i.test(r.type)) ?? routes[0];
    return {
      credits: preferred.credits,
      total: routes.reduce((sum, r) => sum + r.credits, 0),
      routes,
      raw: text,
    };
  }

  // 3. Texte brut : un nombre seul
  const standalone = toNumber(text);
  return { credits: standalone, total: standalone, routes: [], raw: text };
}