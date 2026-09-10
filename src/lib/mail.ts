import "server-only";
import nodemailer from "nodemailer";

// ─── CONFIGURATION SMTP (Gmail + App Password) ────────────────────────────────
// Voir .env : SMTP_USER (axionaa.academy@gmail.com) + SMTP_APP_PASSWORD

const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER ?? "";
// L'app password Google peut contenir des espaces : on les retire
const SMTP_APP_PASSWORD = (process.env.SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME ?? "ZAM Hajj & Oumra";

const BRAND = "#0f5132"; // couleur emerald de la plateforme

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth:
    SMTP_USER && SMTP_APP_PASSWORD
      ? { user: SMTP_USER, pass: SMTP_APP_PASSWORD }
      : undefined,
  connectionTimeout: 10_000,
});

export function isMailConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_APP_PASSWORD);
}

type SendOtpEmailParams = {
  to: string;
  code: string; // 6 chiffres en clair — uniquement pour l'email
  userName: string;
  tenantName: string;
};

export async function sendOtpEmail({ to, code, userName, tenantName }: SendOtpEmailParams) {
  if (!isMailConfigured()) {
    throw new Error("SMTP non configuré (SMTP_USER / SMTP_APP_PASSWORD)");
  }

  const subject = `Code de réinitialisation — ${tenantName}`;

  const text = [
    `Bonjour ${userName},`,
    ``,
    `Vous avez demandé la réinitialisation de votre mot de passe sur ${tenantName}.`,
    `Voici votre code de vérification : ${code}`,
    ``,
    `Ce code est valable 10 minutes.`,
    `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    ``,
    `— ${tenantName}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background-color:${BRAND};padding:28px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-size:20px;margin:0;">${tenantName}</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#111827;font-size:18px;margin:0 0 12px;">Réinitialisation de votre mot de passe</h2>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Bonjour ${userName},<br/>
            Vous avez demandé la réinitialisation de votre mot de passe.
            Voici votre code de vérification :
          </p>
          <div style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <span style="color:${BRAND};font-size:36px;font-weight:bold;letter-spacing:10px;">${code}</span>
          </div>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
            ⏱ Ce code est <strong>valable 10 minutes</strong>.
          </p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
            🔒 Si vous n'êtes pas à l'origine de cette demande, ignorez cet email —
            votre mot de passe restera inchangé.
          </p>
        </div>
        <div style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  await transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
