// ─────────────────────────────────────────────────────────────────────────────
// Programme détaillé d'une offre — SOURCE UNIQUE DE VÉRITÉ
//
// Ce module définit le schéma du champ `Offer.data` (JSON) qui porte le détail
// d'un voyage : vols, hôtels, programme jour par jour, inclus / non inclus,
// documents et points forts. Il est lu par :
//   · l'espace agence   → ProgramModal (édition)
//   · le portail pèlerin → /compte/mon-programme
//   · le site public    → /offres/[slug] (DbOfferDetail)
//
// Il contient aussi les MODÈLES STANDARD (Hajj / Oumra) dérivés des offres
// curatées historiques, pour pré-remplir un voyage en un clic.
// ─────────────────────────────────────────────────────────────────────────────

import { OFFERS } from "./offers-data";

export type ProgramFlight = {
  direction?: string;   // Aller / Retour
  airline?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;        // heure de départ
  arrivalTime?: string; // heure d'arrivée
  stopover?: string;    // escale
  bagageSoute?: string;
  bagageCabine?: string;
};

export type ProgramHotel = {
  city?: string;
  name?: string;
  checkin?: string;
  checkout?: string;
  nights?: number | null;
  distance?: string;
  pension?: string;
};

export type ProgramDay = {
  day?: string;         // « 1 », « 2 »… (les modèles historiques utilisent `step`)
  title?: string;
  description?: string;
};

export type ProgramDocument = { icon?: string; title?: string; content?: string };
export type ProgramHighlight = { icon?: string; label?: string; value?: string };

export type OfferProgramData = {
  maxCapacity?: number;
  highlights?: ProgramHighlight[];
  flights?: ProgramFlight[];
  hotels?: ProgramHotel[];
  program?: ProgramDay[];
  included?: string[];
  notIncluded?: string[];
  documents?: ProgramDocument[];
};

const str = (v: unknown): string | undefined => {
  if (typeof v === "string") {
    const s = v.trim();
    return s.length ? s : undefined;
  }
  if (typeof v === "number") return String(v);
  return undefined;
};

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const lines = (v: unknown): string[] =>
  arr(v)
    .map((x) => str(x))
    .filter((x): x is string => Boolean(x));

const toNights = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Normalise n'importe quelle forme de données programme (schéma unifié, schéma
 * historique `step`/`content`/`departTime`, ou données corrompues) vers
 * `OfferProgramData`. Ne lève jamais : les valeurs invalides sont ignorées.
 */
export function normalizeProgram(raw: unknown): OfferProgramData {
  const d = obj(raw);
  const cap = Number(d.maxCapacity);

  return {
    ...(Number.isFinite(cap) && cap > 0 ? { maxCapacity: cap } : {}),

    highlights: arr(d.highlights)
      .map((h) => {
        const o = obj(h);
        return { icon: str(o.icon), label: str(o.label), value: str(o.value) };
      })
      .filter((h) => h.label || h.value),

    flights: arr(d.flights)
      .map((f) => {
        const o = obj(f);
        return {
          direction: str(o.direction),
          airline: str(o.airline),
          flightNo: str(o.flightNo),
          from: str(o.from),
          to: str(o.to),
          date: str(o.date),
          time: str(o.time) ?? str(o.departTime),
          arrivalTime: str(o.arrivalTime),
          stopover: str(o.stopover),
          bagageSoute: str(o.bagageSoute),
          bagageCabine: str(o.bagageCabine),
        };
      })
      .filter((f) => f.airline || f.from || f.to || f.date),

    hotels: arr(d.hotels)
      .map((h) => {
        const o = obj(h);
        return {
          city: str(o.city),
          name: str(o.name),
          checkin: str(o.checkin),
          checkout: str(o.checkout),
          nights: toNights(o.nights),
          distance: str(o.distance),
          pension: str(o.pension),
        };
      })
      .filter((h) => h.name || h.city),

    program: arr(d.program)
      .map((p, i) => {
        const o = obj(p);
        // `step` (modèles historiques) → `day` (schéma unifié)
        const day = str(o.day) ?? str(o.step) ?? String(i + 1);
        return {
          day,
          title: str(o.title),
          description: str(o.description) ?? str(o.content),
        };
      })
      .filter((p) => p.title || p.description),

    included: lines(d.included),
    notIncluded: lines(d.notIncluded),

    documents: arr(d.documents)
      .map((doc) => {
        const o = obj(doc);
        return { icon: str(o.icon), title: str(o.title), content: str(o.content) };
      })
      .filter((doc) => doc.title || doc.content),
  };
}

/** Vrai si le programme contient au moins un contenu affichable. */
export function hasProgramContent(p: OfferProgramData): boolean {
  return Boolean(
    p.program?.length ||
      p.flights?.length ||
      p.hotels?.length ||
      p.included?.length ||
      p.notIncluded?.length ||
      p.documents?.length ||
      p.highlights?.length
  );
}

//  Modèles standard ─────────────────────────────────────────────────────────
// Dérivés des offres curatées (offers-data.ts) : le contenu de référence du
// Hajj et de l'Oumra, à copier dans un voyage de l'agence puis à ajuster.

const fromCurated = (type: "OUMRA" | "HADJ"): OfferProgramData => {
  const src = OFFERS.find((o) => o.type === type);
  return src ? normalizeProgram(src) : {};
};

export const STANDARD_TEMPLATES: Record<"HAJJ" | "UMRAH", OfferProgramData> = {
  UMRAH: fromCurated("OUMRA"),
  HAJJ: fromCurated("HADJ"),
};

/** Modèle correspondant au type d'offre DB (« HAJJ » ou « UMRAH »). */
export function standardTemplate(type: string): OfferProgramData {
  return type === "HAJJ" ? STANDARD_TEMPLATES.HAJJ : STANDARD_TEMPLATES.UMRAH;
}
