import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";

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
