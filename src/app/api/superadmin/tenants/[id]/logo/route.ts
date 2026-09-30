import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { requireThemeEditor } from "@/lib/permissions";

export const runtime = "nodejs";

// POST — téléverse le logo de l'agence vers Cloudinary et l'attache au thème.
// Superadmin, ou admin de l'agence elle-même si la personnalisation autonome
// est activée par la plateforme (voir requireThemeEditor).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await requireThemeEditor(id);
  if (access.error) return access.error;
  const theme = (access.theme ?? {}) as Record<string, unknown>;

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

    const nextTheme = { ...theme, logoUrl: String(result.secure_url) };

    await prisma.tenant.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { theme: nextTheme as any },
    });

    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: "Échec de l'upload du logo" }, { status: 502 });
  }
}