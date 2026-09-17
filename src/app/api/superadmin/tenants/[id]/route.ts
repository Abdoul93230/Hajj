import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import { mergeTenantTheme, readTenantBranding } from "@/lib/tenant-theme";
import { logAction } from "@/lib/audit";

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

// PUT — met à jour le thème (couleurs, logo, réseaux, textes) via merge non destructif
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant || tenant.status === "PLATFORM") {
    return NextResponse.json({ error: "Tenant non modifiable" }, { status: 403 });
  }

  try {
    const patch = (await req.json()) as Record<string, unknown>;
    const nextTheme = mergeTenantTheme(tenant.theme, patch);
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
    const { name, email, phone, address, country, plan, status } = body;

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
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE — supprimer une agence (soft: status CANCELLED)
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

  await prisma.tenant.update({ where: { id }, data: { status: "CANCELLED" } });

  return NextResponse.json({ ok: true });
}
