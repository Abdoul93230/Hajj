import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";

export const runtime = "nodejs";

// POST — téléverse le logo de l'agence vers Cloudinary et l'attache au thème
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant || tenant.status === "PLATFORM") {
    return NextResponse.json({ error: "Tenant non modifiable" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le logo doit être une image" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo trop volumineux (max 4 Mo)" }, { status: 413 });
  }

  try {
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `hajj-platform/${id}/branding`,
      public_id: "logo",
      overwrite: true,
      invalidate: true,
    });

    const existing = (tenant.theme ?? {}) as Record<string, unknown>;
    const theme = { ...existing, logoUrl: String(result.secure_url) };

    await prisma.tenant.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { theme: theme as any },
    });

    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: "Échec de l'upload du logo" }, { status: 502 });
  }
}