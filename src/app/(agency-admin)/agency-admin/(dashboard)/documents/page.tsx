import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import { redirect } from "next/navigation";
import DocumentsClient from "./DocumentsClient";

export const metadata: Metadata = { title: "Documents Pèlerins" };

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) redirect("/agency-admin/login");

  const tenantId = session.tenantId;

  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);

  // Pèlerins de l'année avec leurs documents
  const pilgrims = await prisma.user.findMany({
    where: { tenantId, role: "PILGRIM", active: true, createdAt: { gte: from, lt: to } },
    include: {
      documents: {
        where: { createdAt: { gte: from, lt: to } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const serialized = pilgrims.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    photoUrl: p.photoUrl,
    gender: p.gender,
    pilgrimStatus: p.pilgrimStatus,
    hasPassport: p.hasPassport,
    hasCni: p.hasCni,
    documents: p.documents.filter((d) => d.type !== "VACCINE").map((d) => ({
      id: d.id,
      type: d.type as "PASSPORT" | "CNI" | "VISA" | "PHOTO" | "MEDICAL" | "OTHER",
      status: d.status as "RECEIVED" | "VALID" | "EXPIRED" | "REJECTED",
      label: d.label,
      fileUrl: d.fileUrl,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
    })),
  }));

  return <DocumentsClient pilgrims={serialized} selectedYear={selectedYear} />;
}
