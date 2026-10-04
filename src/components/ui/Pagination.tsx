"use client";

import { useMemo, useState } from "react";
import {
  PAGE_SIZE_OPTIONS,
  clampPage,
  pageCountOf,
  pageNumbers,
  resolvePageSize,
} from "@/lib/pagination";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type PaginationState<T> = {
  /** Page courante (1-indexée, toujours dans les bornes). */
  page: number;
  /** Nombre total de pages (≥ 1). */
  pageCount: number;
  /** Nombre d'éléments affichés par page. */
  pageSize: number;
  /** Éléments de la page courante — à mapper dans la liste. */
  pageItems: T[];
  /** Nombre total d'éléments (après filtrage). */
  total: number;
  /** Indice (1-indexé) du premier élément affiché. */
  from: number;
  /** Indice (1-indexé) du dernier élément affiché. */
  to: number;
  canPrev: boolean;
  canNext: boolean;
  /** `true` uniquement si la pagination est réellement utile (> 1 page). */
  paginated: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  prev: () => void;
  next: () => void;
};

/**
 * Découpe une liste en pages et expose l'état complet du paginateur.
 *
 * La taille de page vaut 10 par défaut et reste ajustable par l'utilisateur
 * (10 / 25 / 50 / 100).
 *
 * @param items    Liste déjà filtrée / triée.
 * @param resetKey Décrit les critères de filtrage : tout changement remet la
 *                 liste en page 1 (ex. `${search}|${statusFilter}`).
 */
export function usePagination<T>(items: T[], resetKey: string | number = ""): PaginationState<T> {
  const total = items.length;
  const [preferredSize, setPreferredSize] = useState<number | null>(null);

  const pageSize  = resolvePageSize(preferredSize);
  const pageCount = pageCountOf(total, pageSize);

  // Contexte de pagination : tout changement de critère (recherche, filtre,
  // taille de page) ramène naturellement la liste en page 1, sans effet ni
  // render supplémentaire — l'état mémorise la page demandée ET son contexte.
  const key = `${resetKey}|${pageSize}`;
  const [request, setRequest] = useState<{ key: string; page: number }>({ key, page: 1 });

  // Page affichée : 1 si le contexte a changé, sinon la page demandée, toujours
  // ramenée dans les bornes (élément supprimé, filtre plus restrictif…).
  const page = clampPage(request.key === key ? request.page : 1, pageCount);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  const go = (p: number) => setRequest({ key, page: clampPage(p, pageCount) });

  return {
    page,
    pageCount,
    pageSize,
    pageItems,
    total,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    canPrev: page > 1,
    canNext: page < pageCount,
    paginated: pageCount > 1,
    setPage: go,
    setPageSize: (s: number) => setPreferredSize(s),
    prev: () => go(page - 1),
    next: () => go(page + 1),
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────

type PaginationProps<T> = {
  pagination: PaginationState<T>;
  /** Nom de l'élément au singulier, pour le libellé (« versement », « pèlerin »). */
  itemLabel: string;
  /** Masque le récapitulatif « 1–25 sur 132 » (déjà affiché ailleurs). */
  hideRange?: boolean;
  /** Masque le sélecteur « par page ». */
  hideSizeSelector?: boolean;
  className?: string;
};

/**
 * Paginateur discret : il ne s'affiche **que** si la liste dépasse une page,
 * sinon les listes conservent simplement leurs compteurs habituels.
 */
export default function Pagination<T>({
  pagination,
  itemLabel,
  hideRange = false,
  hideSizeSelector = false,
  className = "",
}: PaginationProps<T>) {
  const {
    page, pageCount, pageSize, total, from, to,
    canPrev, canNext, setPage, setPageSize, prev, next, paginated,
  } = pagination;

  if (!paginated) return null;

  return (
    <div className={`flex flex-wrap items-center justify-end gap-3 ${className}`}>

      {!hideRange && (
        <p className="text-[11px] text-gray-400 mr-auto">
          <span className="font-semibold text-gray-500">{from}–{to}</span> sur {total}{" "}
          {itemLabel}{total > 1 ? "s" : ""}
          <span className="text-gray-300"> · page {page}/{pageCount}</span>
        </p>
      )}

      {!hideSizeSelector && (
        <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="hidden sm:inline">Par page</span>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="text-[11px] py-1 px-2 border border-gray-200 rounded-lg bg-white text-gray-500 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={prev}
          disabled={!canPrev}
          title="Page précédente"
          aria-label="Page précédente"
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {pageNumbers(page, pageCount).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className="px-0.5 text-xs text-gray-300 select-none">…</span>
          ) : (
            <button
              key={n}
              onClick={() => setPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-semibold transition ${
                n === page
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={next}
          disabled={!canNext}
          title="Page suivante"
          aria-label="Page suivante"
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
