import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaticMessages } from "@/lib/static-messages";
import {
  META_DESCRIPTION_SLOT,
  THEME_TEXT_SLOTS,
  readMessagePath,
  type SlotLocales,
  type ThemeSlotGroupPayload,
} from "@/lib/tenant-theme";
import ThemeTextEditor from "./ThemeTextEditor";

function readOverride(raw: unknown): SlotLocales {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (x: unknown) => (typeof x === "string" ? x : "");
  return { fr: s(o.fr), en: s(o.en), ar: s(o.ar) };
}

export default async function TextesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, theme: true, status: true },
  });
  if (!tenant || tenant.status === "PLATFORM") notFound();

  // Textes statiques (placeholder + repli) dans les 3 langues
  const [frMsgs, enMsgs, arMsgs] = await Promise.all([
    getStaticMessages("fr"),
    getStaticMessages("en"),
    getStaticMessages("ar"),
  ]);

  const theme = (tenant.theme ?? {}) as Record<string, unknown>;
  const content = (theme.content ?? {}) as Record<string, unknown>;

  const groups: ThemeSlotGroupPayload[] = THEME_TEXT_SLOTS.map((group) => ({
    group: group.group,
    slots: group.slots.map((slot) => ({
      key: slot.key,
      label: slot.label,
      hint: slot.hint,
      multiline: slot.multiline,
      statics: {
        fr: readMessagePath(frMsgs, slot.key),
        en: readMessagePath(enMsgs, slot.key),
        ar: readMessagePath(arMsgs, slot.key),
      },
      override: readOverride(content[slot.key]),
    })),
  }));

  const metaStatics: SlotLocales = {
    fr: process.env.NEXT_PUBLIC_META_DESCRIPTION ?? "Agence de pèlerinage Hajj & Oumra",
    en: process.env.NEXT_PUBLIC_META_DESCRIPTION ?? "Hajj & Umrah pilgrimage agency",
    ar: process.env.NEXT_PUBLIC_META_DESCRIPTION ?? "وكالة حج وعمرة",
  };

  return (
    <ThemeTextEditor
      tenantId={tenant.id}
      groups={groups}
      metaKey={META_DESCRIPTION_SLOT}
      metaStatics={metaStatics}
      metaOverride={readOverride(content[META_DESCRIPTION_SLOT])}
    />
  );
}