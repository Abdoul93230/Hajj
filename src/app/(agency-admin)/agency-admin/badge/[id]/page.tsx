import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import BadgeView from "./BadgeView";

export default async function BadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) redirect("/agency-admin/login");

  const { id } = await params;
  const tenantId = session.tenantId;

  const pilgrim = await prisma.user.findFirst({
    where: { id, tenantId, role: "PILGRIM" },
    include: {
      reservations: {
        include: { offer: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!pilgrim) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, email: true, phone: true, address: true, theme: true },
  });

  const res = pilgrim.reservations[0] ?? null;

  const qrData = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://zamvoyages.com"}/agency-admin/pilgrims/${id}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, {
    width: 180, margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logoUrl = (tenant?.theme as any)?.logoUrl as string | undefined;

  const data = {
    pilgrim: {
      id:             pilgrim.id,
      name:           pilgrim.name,
      phone:          pilgrim.phone,
      photoUrl:       pilgrim.photoUrl,
      gender:         pilgrim.gender,
      birthDate:      pilgrim.birthDate?.toISOString() ?? null,
      city:           pilgrim.city,
      country:        pilgrim.country,
      address:        pilgrim.address,
      profession:     pilgrim.profession,
      emergencyName:  pilgrim.emergencyName,
      emergencyPhone: pilgrim.emergencyPhone,
      hasPassport:    pilgrim.hasPassport,
      hasCni:         pilgrim.hasCni,
      pilgrimStatus:  pilgrim.pilgrimStatus,
      createdAt:      pilgrim.createdAt.toISOString(),
    },
    offer: res ? {
      titleFr:       res.offer.titleFr,
      type:          res.offer.type,
      currency:      res.offer.currency,
      departureDate: res.offer.departureDate?.toISOString() ?? null,
      returnDate:    res.offer.returnDate?.toISOString()    ?? null,
      category:      res.category,
    } : null,
    agency: {
      name:    tenant?.name    ?? "Agence",
      email:   tenant?.email   ?? "",
      phone:   tenant?.phone   ?? null,
      address: tenant?.address ?? null,
    },
    logoUrl,
    qrDataUrl,
  };

  return <BadgeView {...JSON.parse(JSON.stringify(data))} />;
}
