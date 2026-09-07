import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ─── GET /api/agency-admin/pilgrims ──────────────────────────────────────────
export async function GET() {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  // Determine selected year from cookie
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;

  const from = new Date(selectedYear, 0, 1);
  const to = new Date(selectedYear + 1, 0, 1);

  const pilgrims = await prisma.user.findMany({
    where: {
      tenantId,
      role: "PILGRIM",
      createdAt: { gte: from, lt: to },
    },
    include: {
      reservations: {
        include: {
          offer: true,
          payments: { orderBy: { paidAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ pilgrims });
}

// ─── POST /api/agency-admin/pilgrims ─────────────────────────────────────────
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const tenantSlug = session.tenantSlug;

  // Utiliser l'année sélectionnée pour dater l'enregistrement
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const createdAt = selectedYear === currentYear
    ? new Date()
    : new Date(selectedYear, 0, 2); // 2 jan de l'année sélectionnée

  const body = await req.json();
  const {
    name,
    email,
    phone,
    gender,
    birthDate,
    city,
    country,
    address,
    profession,
    photoUrl,
    emergencyName,
    emergencyPhone,
    hasPassport,
    hasCni,
    pilgrimStatus,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Le nom complet est requis" }, { status: 400 });
  }

  // Generate email if not provided
  const finalEmail = email?.trim()
    ? email.trim()
    : `pilgrim-${Date.now()}@${tenantSlug}.nomail`;

  // Check for email uniqueness within tenant
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: finalEmail } },
  });
  if (existing) {
    return NextResponse.json({ error: "Un pèlerin avec cet email existe déjà" }, { status: 409 });
  }

  // Hash random password
  const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const pilgrim = await prisma.user.create({
    data: {
      tenantId,
      email: finalEmail,
      name: name.trim(),
      phone: phone?.trim() || null,
      password: hashedPassword,
      role: "PILGRIM",
      gender: gender || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      address: address?.trim() || null,
      profession: profession?.trim() || null,
      photoUrl: photoUrl?.trim() || null,
      emergencyName: emergencyName?.trim() || null,
      emergencyPhone: emergencyPhone?.trim() || null,
      hasPassport: hasPassport ?? false,
      hasCni: hasCni ?? false,
      pilgrimStatus: pilgrimStatus || "PENDING",
      createdBy: session.id,
      createdAt,
    },
    include: {
      reservations: {
        include: {
          offer: true,
          payments: { orderBy: { paidAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ pilgrim }, { status: 201 });
}
