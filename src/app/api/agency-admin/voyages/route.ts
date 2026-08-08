import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ─── GET /api/agency-admin/voyages ───────────────────────────────────────────
export async function GET(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "1";

  const offers = await prisma.offer.findMany({
    where: {
      tenantId,
      ...(showAll ? {} : { active: true }),
    },
    include: {
      _count: {
        select: {
          reservations: {
            where: { status: "CONFIRMED" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = offers.map((o) => ({
    ...o,
    confirmedCount: o._count.reservations,
    maxCapacity:
      o.data && typeof o.data === "object" && "maxCapacity" in (o.data as object)
        ? (o.data as { maxCapacity: number }).maxCapacity
        : 0,
  }));

  return NextResponse.json({ offers: result });
}

// ─── POST /api/agency-admin/voyages ──────────────────────────────────────────
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  // Dater le voyage dans l'année sélectionnée
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const createdAt = selectedYear === currentYear
    ? new Date()
    : new Date(selectedYear, 0, 2);

  const body = await req.json();
  const {
    titleFr,
    type,
    descFr,
    departureDate,
    returnDate,
    priceAdult,
    priceBaby,
    priceChild,
    priceCouple,
    currency,
    maxCapacity,
    provisional,
  } = body;

  if (!titleFr?.trim()) {
    return NextResponse.json({ error: "Le nom du voyage est requis" }, { status: 400 });
  }
  if (!type || !["HAJJ", "UMRAH"].includes(type)) {
    return NextResponse.json({ error: "Le type de voyage est invalide" }, { status: 400 });
  }
  if (priceAdult === undefined || priceAdult === null || isNaN(Number(priceAdult))) {
    return NextResponse.json({ error: "Le tarif adulte est requis" }, { status: 400 });
  }

  const slug =
    titleFr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) +
    "-" +
    Date.now();

  const offer = await prisma.offer.create({
    data: {
      tenantId,
      slug,
      type,
      titleFr: titleFr.trim(),
      descFr: (descFr ?? "").trim(),
      departureDate: departureDate ? new Date(departureDate) : null,
      returnDate: returnDate ? new Date(returnDate) : null,
      priceAdult: Number(priceAdult),
      priceBaby: priceBaby !== undefined && priceBaby !== "" ? Number(priceBaby) : null,
      priceChild: priceChild !== undefined && priceChild !== "" ? Number(priceChild) : null,
      priceCouple: priceCouple !== undefined && priceCouple !== "" ? Number(priceCouple) : null,
      currency: currency ?? "FCFA",
      provisional: provisional ?? false,
      active: true,
      data: maxCapacity !== undefined && maxCapacity !== "" && maxCapacity !== null
        ? { maxCapacity: Number(maxCapacity) }
        : undefined,
      createdBy: session.id,
      createdAt,
    },
    include: {
      _count: {
        select: {
          reservations: { where: { status: "CONFIRMED" } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      offer: {
        ...offer,
        confirmedCount: offer._count.reservations,
        maxCapacity:
          offer.data && typeof offer.data === "object" && "maxCapacity" in (offer.data as object)
            ? (offer.data as { maxCapacity: number }).maxCapacity
            : 0,
      },
    },
    { status: 201 }
  );
}
