import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin, requireThemeEditor } from "@/lib/permissions";
import { mergeTenantTheme, readTenantBranding } from "@/lib/tenant-theme";
import { logAction } from "@/lib/audit";
import {
  collectCloudinaryPublicIds,
  deleteCloudinaryFile,
  deleteCloudinaryTenantAssets,
  extractCloudinaryPublicId,
} from "@/lib/cloudinary";

// GET — branding + thème courant du tenant (pour l'éditeur superadmin)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, theme: true, slug: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  return NextResponse.json({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    theme: (tenant.theme ?? {}) as Record<string, unknown>,
    branding: readTenantBranding(tenant.theme, "fr", tenant.name),
  });
}

// PUT — met à jour le thème (couleurs, logo, réseaux, textes) via merge non destructif.
// Accessible au SUPERADMIN et, si la plateforme l'a activé pour l'agence
// (`Tenant.selfPersonalization`), à l'admin de cette agence (voir requireThemeEditor).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await requireThemeEditor(id);
  if (access.error) return access.error;
  const { session } = access;

  try {
    const patch = (await req.json()) as Record<string, unknown>;
    const tenant = await prisma.tenant.findUnique({ where: { id }, select: { theme: true } });
    const nextTheme = mergeTenantTheme(tenant?.theme ?? null, patch);
    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        theme: nextTheme as any,
      },
    });
    await logAction({
      session,
      action: "tenant.theme_updated",
      resource: "tenant",
      resourceId: id,
      after: {
        primaryColor: (nextTheme.primaryColor as string) ?? null,
        accentColor: (nextTheme.accentColor as string) ?? null,
        keys: Object.keys(patch),
      },
    });
    return NextResponse.json({ ok: true, theme: updated.theme });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH — modifier une agence (plan, status, infos)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, email, phone, address, country, plan, status, selfPersonalization } = body;

    // Vérifier que ce n'est pas le tenant platform
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant || tenant.status === "PLATFORM") {
      return NextResponse.json({ error: "Tenant non modifiable" }, { status: 403 });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(country && { country }),
        ...(plan && { plan }),
        ...(status && { status }),
        // Personnalisation autonome (couleurs, logo, images, textes) accordée à
        // cette agence. On n'accepte qu'un booléen explicite.
        ...(typeof selfPersonalization === "boolean" && { selfPersonalization }),
      },
    });

    if (typeof selfPersonalization === "boolean") {
      await logAction({
        session,
        action: selfPersonalization
          ? "tenant.self_personalization_enabled"
          : "tenant.self_personalization_disabled",
        resource: "tenant",
        resourceId: id,
        after: { selfPersonalization },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE — suppression définitive d'une agence et de toutes ses données (Hard Delete)
// Purge en cascade : fichiers Cloudinary, documents, paiements, réservations,
// voyages/offres, avis, messages de contact, logs SMS, OTPs, utilisateurs, et le tenant lui-même.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant || tenant.status === "PLATFORM") {
    return NextResponse.json({ error: "Tenant non supprimable" }, { status: 403 });
  }

  try {
    // ── 1. Nettoyage des fichiers distants (Cloudinary) ──────────────────────
    // Deux passes complémentaires. Un échec Cloudinary n'empêche JAMAIS la purge
    // en base, mais il est compté et remonté au superadmin.
    let cloudinaryDeleted = 0;
    let cloudinaryErrors = 0;

    // a) PAR PRÉFIXE (filet de sécurité) — tout ce qu'une agence téléverse vit
    //    sous `hajj-platform/<tenantId>/` : documents pèlerins (images ET PDF
    //    « raw »), reçus de paiement, images de marque. Couvre aussi les fichiers
    //    dont la ligne en base a déjà disparu — sans liste de clés à maintenir.
    const byPrefix = await deleteCloudinaryTenantAssets(id);
    cloudinaryDeleted += byPrefix.deleted;
    cloudinaryErrors += byPrefix.errors;

    // b) PAR RÉFÉRENCE (ceinture) — chaque URL enregistrée en base est purgée
    //    individuellement, y compris TOUTES les URLs Cloudinary du thème
    //    collectées récursivement (logo, hero, bannières, galeries, partenaires…).
    const [docs, users, payments] = await Promise.all([
      prisma.pilgrimDocument.findMany({ where: { tenantId: id }, select: { fileUrl: true } }),
      prisma.user.findMany({
        where: { tenantId: id, photoUrl: { not: null } },
        select: { photoUrl: true },
      }),
      prisma.payment.findMany({
        where: { tenantId: id, receiptUrl: { not: null } },
        select: { receiptUrl: true },
      }),
    ]);

    const publicIds = new Set<string>(collectCloudinaryPublicIds(tenant.theme));
    for (const url of [
      ...docs.map((d) => d.fileUrl),
      ...users.map((u) => u.photoUrl),
      ...payments.map((p) => p.receiptUrl),
    ]) {
      if (typeof url !== "string") continue;
      const pid = extractCloudinaryPublicId(url);
      if (pid) publicIds.add(pid);
    }

    for (const pid of publicIds) {
      try {
        await deleteCloudinaryFile(pid);
      } catch {
        cloudinaryErrors++;
      }
    }

    // 2. Suppression en cascade dans la base de données
    await prisma.$transaction([
      prisma.pilgrimDocument.deleteMany({ where: { tenantId: id } }),
      prisma.payment.deleteMany({ where: { tenantId: id } }),
      prisma.reservation.deleteMany({ where: { tenantId: id } }),
      prisma.offer.deleteMany({ where: { tenantId: id } }),
      prisma.smsMessage.deleteMany({ where: { tenantId: id } }),
      prisma.contactMessage.deleteMany({ where: { tenantId: id } }),
      prisma.review.deleteMany({ where: { tenantId: id } }),
      prisma.passwordResetOtp.deleteMany({ where: { tenantId: id } }),
      prisma.auditLog.deleteMany({ where: { tenantId: id } }),
      prisma.user.deleteMany({ where: { tenantId: id } }),
      prisma.tenant.delete({ where: { id } }),
    ]);

    await logAction({
      session,
      action: "tenant.purged",
      resource: "tenant",
      resourceId: id,
      after: {
        name: tenant.name,
        slug: tenant.slug,
        cloudinaryDeleted,
        cloudinaryFilesReferenced: publicIds.size,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      purged: true,
      // Rapport de purge des fichiers : le superadmin voit ce qui a été nettoyé
      // (un échec Cloudinary ne bloque pas la suppression, mais se voit ici).
      cloudinary: {
        deleted: cloudinaryDeleted,
        errors: cloudinaryErrors,
        referenced: publicIds.size,
      },
    });
  } catch (err) {
    console.error("Erreur lors de la suppression définitive du tenant :", err);
    return NextResponse.json({ error: "Échec de la suppression définitive" }, { status: 500 });
  }
}
