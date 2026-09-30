// ─── Données de l'éditeur « Textes du portail » ──────────────────────────────
//
// Construction PARTAGÉE entre l'espace superadmin
// (/superadmin/tenants/[id]/personnalisation/textes) et l'espace agence
// (/agency-admin/personalisation/textes) : une seule source, donc un seul
// comportement (mêmes slots, mêmes libellés, même repli sur les statiques).

import { getStaticMessages } from "@/lib/static-messages";
import {
  ANNOUNCEMENT_SLOT,
  META_DESCRIPTION_SLOT,
  buildThemeTextCatalog,
  readMessagePath,
  type SlotLocales,
  type ThemeSlotGroupPayload,
} from "@/lib/tenant-theme";

/** Override du tenant pour une clé (chaîne vide = pas d'override). */
export function readOverride(raw: unknown): SlotLocales {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (x: unknown) => (typeof x === "string" ? x : "");
  return { fr: s(o.fr), en: s(o.en), ar: s(o.ar) };
}

export type ThemeTextEditorData = {
  groups: ThemeSlotGroupPayload[];
  metaKey: string;
  metaStatics: SlotLocales;
  metaOverride: SlotLocales;
};

/** Slots éditables + textes statiques (placeholder et repli) dans les 3 langues. */
export async function buildThemeTextEditorData(
  theme: unknown
): Promise<ThemeTextEditorData> {
  const [frMsgs, enMsgs, arMsgs] = await Promise.all([
    getStaticMessages("fr"),
    getStaticMessages("en"),
    getStaticMessages("ar"),
  ]);

  const themeObj = theme && typeof theme === "object" ? (theme as Record<string, unknown>) : {};
  const content = (themeObj.content ?? {}) as Record<string, unknown>;

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
        // au superadmin (ou à l'agence, si activé) de le saisir.
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

  return {
    groups,
    metaKey: META_DESCRIPTION_SLOT,
    metaStatics,
    metaOverride: readOverride(content[META_DESCRIPTION_SLOT]),
  };
}
