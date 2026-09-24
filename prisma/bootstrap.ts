// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP PRODUCTION — base neuve : crée le STRICT NÉCESSAIRE pour se connecter.
//
//   · tenant plateforme (`__platform__`) + utilisateur SUPER_ADMIN
//   · une agence (slug, nom, email…) + son utilisateur AGENCY_ADMIN
//   · l'index unique SPARSE sur `Tenant.customDomain` (que `db push` ne crée pas)
//
// Idempotent : relançable autant de fois que voulu, NE SUPPRIME RIEN, aucune
// donnée de démo. Pour la base de démonstration complète, voir `npm run seed`
// (⚠️ celui-ci purge TOUTE la base avant de la remplir : jamais en production).
//
// Usage (dans l'ordre, sur le serveur de production) :
//   npx prisma generate
//   npx prisma db push                                    # structure + index
//   npm run bootstrap                                      # lit .env
//   # ou, avec un autre fichier d'environnement :
//   npx tsx --env-file=.env.production prisma/bootstrap.ts
//
// Pour AJOUTER une autre agence : relancer avec un autre BOOTSTRAP_TENANT_SLUG.
//
// Variables lues (toutes optionnelles — défaut entre parenthèses) :
//   SUPER_ADMIN_EMAIL                (superadmin@hajj-platform.com)
//   SUPER_ADMIN_PASSWORD             (SuperAdmin123!)
//   SUPER_ADMIN_NAME                 (Super Admin)
//   BOOTSTRAP_TENANT_SLUG            (zam)
//   BOOTSTRAP_TENANT_NAME            (nom déduit du slug)
//   BOOTSTRAP_TENANT_EMAIL           (contact@<slug>.com)
//   BOOTSTRAP_TENANT_PHONE / _ADDRESS / _COUNTRY / _PLAN   (—, NE, PRO)
//   BOOTSTRAP_ADMIN_NAME             (Admin <NOM>)
//   BOOTSTRAP_ADMIN_EMAIL            (sinon <SLUG>_ADMIN_EMAIL, ex. ZAM_ADMIN_EMAIL)
//   BOOTSTRAP_ADMIN_PASSWORD         (sinon <SLUG>_ADMIN_PASSWORD)
//   BOOTSTRAP_RESET_PASSWORD=true    → réécrit le mot de passe si le compte existe
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLATFORM_SLUG = "__platform__";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function hashPw(pw: string) {
  return bcrypt.hash(pw, 12);
}

function envOr(name: string, fallback: string): string {
  const raw = (process.env[name] ?? "").trim();
  return raw || fallback;
}

/** Valeur `null` si l'option n'est pas renseignée (évite d'écrire des ""). */
function envOpt(name: string): string | null {
  const raw = (process.env[name] ?? "").trim();
  return raw || null;
}

/** « zam » + « ADMIN_EMAIL » → « ZAM_ADMIN_EMAIL » (clé .env dérivée du slug). */
function slugEnvKey(slug: string, suffix: string): string {
  return slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_" + suffix;
}

function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resetRequested(): boolean {
  return ["1", "true", "yes", "oui"].includes(
    (process.env.BOOTSTRAP_RESET_PASSWORD ?? "").trim().toLowerCase()
  );
}

// ─── Étapes (toutes idempotentes) ───────────────────────────────────────────

async function ensurePlatformTenant() {
  const existing = await prisma.tenant.findUnique({ where: { slug: PLATFORM_SLUG } });
  if (existing) return { tenant: existing, created: false };
  const tenant = await prisma.tenant.create({
    data: {
      slug: PLATFORM_SLUG,
      name: "Hajj Platform",
      email: "platform@hajj-platform.com",
      plan: "ENTERPRISE",
      status: "PLATFORM",
    },
  });
  return { tenant, created: true };
}

async function ensureUser(input: {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  role: "SUPER_ADMIN" | "AGENCY_ADMIN";
  resetPassword: boolean;
}) {
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: input.tenantId, email: input.email } },
  });
  if (existing) {
    if (input.resetPassword) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: await hashPw(input.password), active: true },
      });
      return { user: existing, created: false, passwordReset: true };
    }
    return { user: existing, created: false, passwordReset: false };
  }
  const user = await prisma.user.create({
    data: {
      tenantId: input.tenantId,
      email: input.email,
      name: input.name,
      password: await hashPw(input.password),
      role: input.role,
      permissions: [],
      active: true,
    },
  });
  return { user, created: true, passwordReset: false };
}

async function ensureAgencyTenant() {
  const slug = envOr("BOOTSTRAP_TENANT_SLUG", "zam").toLowerCase();
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) return { tenant: existing, created: false, slug };

  const name = envOr("BOOTSTRAP_TENANT_NAME", titleFromSlug(slug));
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name,
      email: envOr("BOOTSTRAP_TENANT_EMAIL", `contact@${slug}.com`),
      phone: envOpt("BOOTSTRAP_TENANT_PHONE"),
      address: envOpt("BOOTSTRAP_TENANT_ADDRESS"),
      country: envOr("BOOTSTRAP_TENANT_COUNTRY", "NE"),
      plan: envOr("BOOTSTRAP_TENANT_PLAN", "PRO") as "STARTER" | "PRO" | "ENTERPRISE",
      status: "ACTIVE",
    },
  });
  return { tenant, created: true, slug };
}

/**
 * Index unique sparse sur Tenant.customDomain.
 * ⚠️ Volontairement absent du schéma Prisma (voir le commentaire de schema.prisma) :
 * il doit être créé à la main sur une base neuve, sinon un index non-sparse
 * refuserait plusieurs tenants sans domaine personnalisé.
 */
async function ensureCustomDomainIndex() {
  const NAME = "Tenant_customDomain_key";
  try {
    const res = (await prisma.$runCommandRaw({ listIndexes: "Tenant" })) as {
      cursor?: { firstBatch?: { name?: string; sparse?: boolean; unique?: boolean }[] };
    };
    const existing = (res.cursor?.firstBatch ?? []).find((i) => i.name === NAME);
    if (existing) {
      return existing.sparse === true && existing.unique === true
        ? "déjà présent"
        : "déjà présent mais NON sparse/unique — à corriger à la main";
    }
    await prisma.$runCommandRaw({
      createIndexes: "Tenant",
      indexes: [{ key: { customDomain: 1 }, name: NAME, unique: true, sparse: true }],
    });
    return "créé";
  } catch (e) {
    const code = (e as { code?: number }).code;
    // 26 = NamespaceNotFound (collection pas encore créée) → normal juste après db push
    if (code === 26) return "reporté (collection Tenant pas encore créée)";
    return `non créé (${(e as Error).message})`;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const reset = resetRequested();

  console.log("🔧 Bootstrap de la base (aucune suppression, aucune donnée de démo)\n");

  // 1) Plateforme + superadmin
  const { tenant: platform, created: platformCreated } = await ensurePlatformTenant();
  const superEmail = envOr("SUPER_ADMIN_EMAIL", "superadmin@hajj-platform.com");
  const superPassword = envOr("SUPER_ADMIN_PASSWORD", "SuperAdmin123!");
  const superResult = await ensureUser({
    tenantId: platform.id,
    email: superEmail,
    name: envOr("SUPER_ADMIN_NAME", "Super Admin"),
    password: superPassword,
    role: "SUPER_ADMIN",
    resetPassword: reset,
  });
  console.log(
    `✅ Plateforme (${PLATFORM_SLUG}) ${platformCreated ? "créée" : "déjà présente"}` +
      ` · superadmin ${
        superResult.created ? "créé" : superResult.passwordReset ? "mot de passe réinitialisé" : "déjà présent"
      }`
  );

  // 2) Agence + admin agence
  const { tenant: agency, created: agencyCreated, slug } = await ensureAgencyTenant();
  const adminEmail = envOr(
    "BOOTSTRAP_ADMIN_EMAIL",
    envOr(slugEnvKey(slug, "ADMIN_EMAIL"), `admin@${slug}.com`)
  );
  const adminPassword = envOr(
    "BOOTSTRAP_ADMIN_PASSWORD",
    envOr(slugEnvKey(slug, "ADMIN_PASSWORD"), "Admin123456!")
  );
  const adminResult = await ensureUser({
    tenantId: agency.id,
    email: adminEmail,
    name: envOr("BOOTSTRAP_ADMIN_NAME", `Admin ${agency.name}`),
    password: adminPassword,
    role: "AGENCY_ADMIN",
    resetPassword: reset,
  });
  console.log(
    `✅ Agence « ${agency.name} » (${slug}) ${agencyCreated ? "créée" : "déjà présente"}` +
      ` · admin ${
        adminResult.created ? "créé" : adminResult.passwordReset ? "mot de passe réinitialisé" : "déjà présent"
      }`
  );

  // 3) Index unique sparse — requis par le schéma, non créé par `prisma db push`
  const indexState = await ensureCustomDomainIndex();
  console.log(`✅ Index unique sparse Tenant.customDomain : ${indexState}`);

  const counts = {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    pilgrims: await prisma.user.count({ where: { role: "PILGRIM" } }),
  };

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  COMPTES DE DÉPART");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SUPER ADMIN (plateforme)");
  console.log(`    Email     : ${superEmail}`);
  console.log("    Password  : valeur de SUPER_ADMIN_PASSWORD (.env)");
  console.log("    Connexion : /superadmin/login");
  console.log("  ─────────────────────────────────────────────────────────────");
  console.log(`  ADMIN AGENCE « ${agency.name} » (${slug})`);
  console.log(`    Email     : ${adminEmail}`);
  console.log(`    Password  : valeur de ${slugEnvKey(slug, "ADMIN_PASSWORD")} / BOOTSTRAP_ADMIN_PASSWORD (.env)`);
  console.log("    Connexion : /agency-admin/login");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(
    `\n  Base : ${counts.tenants} tenant(s) · ${counts.users} utilisateur(s) dont ${counts.pilgrims} pèlerin(s)`
  );
  console.log("\n  ⚠️  À vérifier dans l'environnement de production :");
  console.log("     · JWT_SECRET            (signature des sessions)");
  console.log(`     · DEV_DEFAULT_TENANT=${slug}        (déploiement mono-domaine / sans sous-domaine)`);
  console.log("     · ou USE_SUBDOMAIN_TENANT=true     (multi-agences par sous-domaine)");
  console.log("     · NEXT_PUBLIC_APP_URL   (liens des e-mails / SMS)");
  console.log("     · CLOUDINARY_*          (envoi des documents)");
  console.log("     · SMTP_* / LAFRICA_SMS_* (notifications, optionnel)");
  console.log("\n🎉 Bootstrap terminé — vous pouvez vous connecter.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur pendant le bootstrap :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
