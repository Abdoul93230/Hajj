/**
 * Pagination partagée par les listes de l'espace agence.
 *
 * Principes :
 *  - 10 éléments par page par défaut, ajustable (10 / 25 / 50 / 100) ;
 *  - tant que tout tient sur une page, aucun paginateur n'est affiché
 *    (zéro bruit visuel) ;
 *  - la page courante est ramenée dans les bornes quand les filtres changent ou
 *    après une suppression.
 */

/** Tailles de page proposées dans le sélecteur. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/** Taille de page appliquée tant que l'utilisateur n'a rien choisi. */
export const DEFAULT_PAGE_SIZE = 10;

/** Taille effective de page : préférence utilisateur, sinon 10 par défaut. */
export function resolvePageSize(preferred?: number | null): number {
  if (preferred && preferred > 0) return Math.trunc(preferred);
  return DEFAULT_PAGE_SIZE;
}

/** Nombre de pages (toujours ≥ 1). */
export function pageCountOf(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, size)));
}

/** Ramène un numéro de page dans les bornes [1, count]. */
export function clampPage(page: number, count: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, count));
}

/**
 * Numéros de page à afficher avec ellipses, ex. « 1 … 4 5 6 … 20 ».
 * `"gap"` représente l'ellipse (clé stable pour le rendu React).
 */
export function pageNumbers(page: number, count: number, max = 5): (number | "gap")[] {
  if (count <= max + 2) return Array.from({ length: count }, (_, i) => i + 1);

  const half = Math.floor(max / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(count, start + max - 1);
  start = Math.max(1, end - max + 1);

  const out: (number | "gap")[] = [];
  if (start > 1) {
    out.push(1);
    if (start > 2) out.push("gap");
  }
  for (let p = start; p <= end; p++) out.push(p);
  if (end < count) {
    if (end < count - 1) out.push("gap");
    out.push(count);
  }
  return out;
}
