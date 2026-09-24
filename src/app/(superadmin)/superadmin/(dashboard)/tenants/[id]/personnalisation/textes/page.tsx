import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaticMessages } from "@/lib/static-messages";
import {
  ANNOUNCEMENT_SLOT,
  META_DESCRIPTION_SLOT,
  buildThemeTextCatalog,
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

  // Catalogue EXHAUSTIF : construit depuis les 3 arbres de messages (fr = réf.).
  // Une clé dont les 3 statiques sont vides n'a rien à montrer → ignorée.
  const groups: ThemeSlotGroupPayload[] = buildThemeTextCatalog({
    fr: frMsgs,
    en: enMsgs,
    ar: arMsgs,
  })
    .map(({ group, slots }) => ({
      group,
      slots: slots.flatMap((slot) => {
        const statics = {
          fr: readMessagePath(frMsgs, slot.key),
          en: readMessagePath(enMsgs, slot.key),
          ar: readMessagePath(arMsgs, slot.key),
        };
        // Le bandeau d'annonce reste éditable même sans texte par défaut : c'est
        // au superadmin de le saisir (vide = aucun bandeau affiché).
        if (slot.key !== ANNOUNCEMENT_SLOT && !statics.fr && !statics.en && !statics.ar) {
          return [];
        }
        return [
          {
            key: slot.key,
            // Libellé explicite pour le bandeau (la clé brute « text » ne dit rien)
            label:
              slot.key === ANNOUNCEMENT_SLOT
                ? "Annonce (texte défilé en haut du site)"
                : slot.label,
            multiline: slot.multiline || slot.key === ANNOUNCEMENT_SLOT,
            statics,
            override: readOverride(content[slot.key]),
          },
        ];
      }),
    }))
    .filter((group) => group.slots.length > 0);

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