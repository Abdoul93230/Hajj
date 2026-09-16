// ─────────────────────────────────────────────────────────────────────────────
// Pays de résidence / d'origine des pèlerins.
//
// Liste PARTAGÉE pour rester cohérent des deux côtés :
//   · espace agence — modale « Ajouter / Modifier le pèlerin »
//   · portail pèlerin — « Modifier mes informations »
// (les options doivent être identiques : c'est le même champ `User.country`)
// ─────────────────────────────────────────────────────────────────────────────

export const PILGRIM_COUNTRIES: readonly string[] = [
  "Niger",
  "Mali",
  "Sénégal",
  "Burkina Faso",
  "Côte d'Ivoire",
  "Guinée",
  "Ghana",
  "Nigeria",
  "Cameroun",
  "France",
  "Maroc",
  "Algérie",
  "Mauritanie",
  "Bénin",
  "Togo",
];

/**
 * Options du sélecteur « Pays ».
 * La liste partagée, en gardant en tête une valeur libre éventuellement déjà
 * enregistrée (pèlerin créé avant / import) pour ne jamais l'écraser à l'aveugle.
 */
export function countryOptions(currentValue?: string | null): string[] {
  const current = currentValue?.trim();
  if (current && !PILGRIM_COUNTRIES.includes(current)) {
    return [current, ...PILGRIM_COUNTRIES];
  }
  return [...PILGRIM_COUNTRIES];
}