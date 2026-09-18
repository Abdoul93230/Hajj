import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";

export const runtime = "nodejs";

/** Images de marque personnalisables : kind → clé du thème + public_id Cloudinary. */
const KINDS = {
  hero: { key: "heroImageUrl", publicId: "hero" },
  offers: { key: "offersBannerUrl", publicId: "offers-banner" },
  guide: { key: "guideBannerUrl", publicId: "guide-banner" },
  coran: { key: "coranBannerUrl", publicId: "coran-banner" },
  founder: { key: "founderImageUrl", publicId: "founder" },
  "oumra-ramadan": { key: "oumraRamadanImageUrl", publicId: "oumra-ramadan" },
  hajj: { key: "hajjImageUrl", publicId: "hajj" },
  makkah: { key: "makkahImageUrl", publicId: "makkah" },
  medine: { key: "medineImageUrl", publicId: "medine" },
  "menu-ihram": { key: "menuIhramImageUrl", publicId: "menu-ihram" },
  "menu-mosque": { key: "menuMosqueUrl", publicId: "menu-mosque" },
  "history-g1": { key: "historyGallery1Url", publicId: "history-g1" },
  "history-g2": { key: "historyGallery2Url", publicId: "history-g2" },
  "history-g3": { key: "historyGallery3Url", publicId: "history-g3" },
  "history-g4": { key: "historyGallery4Url", publicId: "history-g4" },
  "history-g5": { key: "historyGallery5Url", publicId: "history-g5" },
  "history-g6": { key: "historyGallery6Url", publicId: "history-g6" },
  "history-t1": { key: "historyTeam1Url", publicId: "history-t1" },
  "history-t2": { key: "historyTeam2Url", publicId: "history-t2" },
  "partner-iata": { key: "partnerIataUrl", publicId: "partner-iata" },
  "partner-coho": { key: "partnerCohoUrl", publicId: "partner-coho" },
  "partner-ministry": { key: "partnerMinistryUrl", publicId: "partner-ministry" },
} as const;

type MediaKind = keyof typeof KINDS;

// POST — téléverse une image de marque (hero, bannières) vers Cloudinary
// et l'attache au thème du tenant (clé plate, même mécanique que le logo).
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
  const kind = String(form.get("kind") ?? "");
  if (!(kind in KINDS)) {
    return NextResponse.json({ error: "Type d'image inconnu" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Image trop volumineuse (max 6 Mo)" }, { status: 413 });
  }

  const target = KINDS[kind as MediaKind];

  try {
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `hajj-platform/${id}/branding`,
      public_id: target.publicId,
      overwrite: true,
      invalidate: true,
    });

    const existing = (tenant.theme ?? {}) as Record<string, unknown>;
    const theme = { ...existing, [target.key]: String(result.secure_url) };

    await prisma.tenant.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { theme: theme as any },
    });

    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: "Échec de l'upload de l'image" }, { status: 502 });
  }
}
