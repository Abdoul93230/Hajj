import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// PATCH /api/agency-admin/voyages/[id]/program
// Met à jour le programme détaillé du voyage dans offer.data :
// { highlights?, flights?, hotels?, program?, included?, notIncluded?,
//   documents?, maxCapacity? } — les blocs absents sont préservés, ainsi que
//   les autres clés de offer.data.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  const existing = await prisma.offer.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { flights, hotels, program, included, notIncluded, documents, highlights, maxCapacity } =
    body;

  const current = (existing.data ?? {}) as Record<string, unknown>;

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      data: {
        ...current,
        ...(flights      !== undefined && { flights }),
        ...(hotels       !== undefined && { hotels }),
        ...(program      !== undefined && { program }),
        ...(included     !== undefined && { included }),
        ...(notIncluded  !== undefined && { notIncluded }),
        ...(documents    !== undefined && { documents }),
        ...(highlights   !== undefined && { highlights }),
        ...(maxCapacity  !== undefined && { maxCapacity }),
      },
    },
  });

  return NextResponse.json({ offer: updated });
}