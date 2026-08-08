import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(req: Request) {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : null;
  if (!tenant) {
    return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
  }
  try {
    const reviews = await prisma.review.findMany({
      where: { tenantId: tenant.id, approved: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, rating, comment } = await req.json();
    if (!name || !comment || !rating) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug");
    const tenant = tenantSlug
      ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      : null;
    if (!tenant) {
      return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
    }

    await prisma.review.create({
      data: { tenantId: tenant.id, name, rating: Number(rating), comment, approved: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
