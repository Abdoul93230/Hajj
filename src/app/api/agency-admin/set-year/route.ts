import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;

  const { year } = await req.json();
  const currentYear = new Date().getFullYear();

  // Récupérer l'année de création du tenant pour borner la plage
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
  }

  const minYear = tenant.createdAt.getFullYear();
  const parsedYear = parseInt(year, 10);

  if (isNaN(parsedYear) || parsedYear < minYear || parsedYear > currentYear) {
    return NextResponse.json(
      { error: `Année invalide. Plage autorisée : ${minYear} – ${currentYear}` },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("zam_selected_year", String(parsedYear), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    path: "/",
  });

  return NextResponse.json({ year: parsedYear });
}
