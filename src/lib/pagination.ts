/**
 * Pagination « intelligente » partagée par les listes de l'espace agence.
 *
 * Principes :
 *  - la taille de page s'adapte au volume : tant que tout tient sur une page,
 *    aucun paginateur n'est affiché (zéro bruit visuel) ;
 *  - au-delà, on vise au plus ~4 pages et on rééquilibre la taille de page pour
 *    éviter une dernière page quasi vide (26 pèlerins → 2 pages de 13, et non
 *    une page de 25 suivie d'une page d'un seul élément) ;
 *  - l'utilisateur peut forcer une taille (10 / 25 / 50 / 100) ;
 *  - la page courante est ramenée dans les bornes quand les filtres changent ou
 *    après une suppression.
 */

/** Tailles de page proposées dans le sélecteur. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/** Taille de page « naturelle » pour un volume donné (au plus ~4 pages). */
export function autoPageSize(total: number): number {
  if (total <= 100) return 25;   // petites listes : 1 à 4 pages
  if (total <= 400) return 50;   // listes moyennes : 3 à 8 pages
  return 100;                    // grosses listes
}

/** Rééquilibre la taille de page pour éviter une dernière page quasi vide. */
export function balancedPageSize(total: number, size: number): number {
  const s = Math.max(1, Math.trunc(size));
  if (total <= s) return Math.max(s, total || 1);
  const pages = Math.ceil(total / s);
  const lastPage = total % s === 0 ? s : total % s;
  // Dernière page « orpheline » (≤ 15 % d'une page pleine) : on répartit.
  if (pages > 1 && lastPage <= Math.max(2, Math.floor(s * 0.15))) {
    return Math.ceil(total / pages);
  }
  return s;
}

/** Taille effective de page : préférence utilisateur, sinon calcul adaptatif. */
export function resolvePageSize(total: number, preferred?: number | null): number {
  if (preferred && preferred > 0) return Math.trunc(preferred);
  return balancedPageSize(total, autoPageSize(total));
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
