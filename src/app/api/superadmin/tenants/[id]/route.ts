import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin, requireThemeEditor } from "@/lib/permissions";
import { mergeTenantTheme, readTenantBranding } from "@/lib/tenant-theme";
import { logAction } from "@/lib/audit";
import { deleteCloudinaryFile, extractCloudinaryPublicId } from "@/lib/cloudinary";

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
    // 1. Nettoyage des fichiers distants (Cloudinary)
    // a) Documents des pèlerins
    const docs = await prisma.pilgrimDocument.findMany({
      where: { tenantId: id },
      select: { fileUrl: true },
    });
    for (const d of docs) {
      if (d.fileUrl) {
        const publicId = extractCloudinaryPublicId(d.fileUrl);
        if (publicId) await deleteCloudinaryFile(publicId).catch(() => {});
      }
    }

    // b) Médias du thème de l'agence (logo, hero, bannières)
    if (tenant.theme && typeof tenant.theme === "object") {
      const themeObj = tenant.theme as Record<string, unknown>;
      const urlsToCheck: string[] = [];
      if (typeof themeObj.logoUrl === "string") urlsToCheck.push(themeObj.logoUrl);
      if (typeof themeObj.heroImageUrl === "string") urlsToCheck.push(themeObj.heroImageUrl);
      if (typeof themeObj.hajjBannerUrl === "string") urlsToCheck.push(themeObj.hajjBannerUrl);
      if (typeof themeObj.umrahBannerUrl === "string") urlsToCheck.push(themeObj.umrahBannerUrl);

      for (const url of urlsToCheck) {
        const pid = extractCloudinaryPublicId(url);
        if (pid) await deleteCloudinaryFile(pid).catch(() => {});
      }

    // c) Justificatifs et reçus des paiements
    const paymentsWithReceipt = await prisma.payment.findMany({
      where: { tenantId: id, receiptUrl: { not: null } },
      select: { receiptUrl: true },
    });
    for (const p of paymentsWithReceipt) {
      if (p.receiptUrl) {
        const pid = extractCloudinaryPublicId(p.receiptUrl);
        if (pid) await deleteCloudinaryFile(pid).catch(() => {});
      }
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
      after: { name: tenant.name, slug: tenant.slug },
    }).catch(() => {});

    return NextResponse.json({ ok: true, purged: true });
  } catch (err) {
    console.error("Erreur lors de la suppression définitive du tenant :", err);
    return NextResponse.json({ error: "Échec de la suppression définitive" }, { status: 500 });
  }
}
