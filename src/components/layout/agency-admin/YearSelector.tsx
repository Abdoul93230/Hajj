"use client";

import { useState, useTransition } from "react";

export default function YearSelector({
  selectedYear,
  availableYears,
}: {
  selectedYear: number;
  availableYears: number[];
}) {
  const [year, setYear] = useState(selectedYear);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  async function choose(y: number) {
    setOpen(false);
    if (y === year) return;
    setYear(y);
    startTransition(async () => {
      await fetch("/api/agency-admin/set-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: y }),
      });
      // Recharger la page pour que les Server Components récupèrent le nouveau cookie
      window.location.reload();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#0f5132]/8 hover:bg-[#0f5132]/15 text-[#0f5132] rounded-lg text-sm font-semibold transition-colors border border-[#0f5132]/20"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Saison {year}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Overlay ferme le dropdown au clic extérieur */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[130px] overflow-hidden">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => choose(y)}
                className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                  y === year
                    ? "bg-[#0f5132]/8 text-[#0f5132]"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {y === year && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0f5132] mr-2 mb-0.5" />
                )}
                {y === year ? "" : <span className="inline-block w-3.5 mr-0" />}
                Saison {y}
                {y === new Date().getFullYear() && y !== year && (
                  <span className="ml-2 text-[9px] bg-[#d4af37]/20 text-[#b8920c] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    Actuelle
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
