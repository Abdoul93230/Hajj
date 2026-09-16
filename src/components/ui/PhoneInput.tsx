"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PHONE_COUNTRIES,
  PHONE_OTHER,
  digitsOnly,
  findPhoneCountry,
  formatNational,
  guessDialFromCountry,
  maxNationalDigits,
  type PhoneCountry,
} from "@/lib/phone";

/**
 * Champ téléphone international léger :
 *   [ 🇳🇪 +227 ▾ ] [ 90 12 34 56_ ]
 *  - indicatif choisi dans une liste (Niger en tête, puis diaspora)
 *  - espacement visuel du numéro national selon le pays
 *  - la valeur émise est TOUJOURS l'E.164 compact « +22790123456 »
 *  - `countryName` : pré-sélectionne l'indicatif depuis le pays du formulaire
 *  - `dark` : variante de couleurs pour le superadmin
 */
export default function PhoneInput({
  value,
  onChange,
  countryName,
  disabled,
  required,
  className = "",
  dark = false,
}: {
  value: string;
  onChange: (e164: string) => void;
  countryName?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // Valeur courante découpée
  const country = findPhoneCountry(value);
  const national = digitsOnly(value).slice(country.dial.length || 0);

  // Indicatif affiché : celui de la valeur, sinon deviné depuis le pays
  const shown: PhoneCountry =
    value.startsWith("+") && country.dial
      ? country
      : countryName
        ? (PHONE_COUNTRIES.find((c) => c.dial === guessDialFromCountry(countryName)) ??
          PHONE_COUNTRIES[0])
        : PHONE_COUNTRIES[0];

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(query) || c.dial.includes(query)
    );
  }, [search]);

  function pick(next: PhoneCountry) {
    const digits = national.slice(0, maxNationalDigits(next.groups));
    onChange(next.dial ? `+${next.dial}${digits}` : digits ? `+${digits}` : "");
    setOpen(false);
    setSearch("");
  }

  function type(raw: string) {
    const digits = digitsOnly(raw).slice(0, maxNationalDigits(shown.groups));
    onChange(shown.dial ? `+${shown.dial}${digits}` : digits ? `+${digits}` : "");
  }

  const box = dark
    ? "border-gray-600 bg-gray-900 text-white hover:border-gray-500"
    : "border-gray-200 bg-white hover:border-gray-300";
  const panel = dark ? "bg-gray-900 border-gray-600" : "bg-white border-gray-200";
  const field = dark
    ? "bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
    : "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] transition";

  return (
    <div ref={boxRef} className={`relative flex gap-2 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-medium transition disabled:opacity-50 ${box}`}
        aria-label="Choisir l'indicatif du pays"
      >
        <span className="text-base leading-none">{shown.flag}</span>
        <span className={dark ? "text-gray-200" : "text-gray-700"}>
          {shown.dial ? `+${shown.dial}` : "+"}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          className={`text-gray-400 transition ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      <input
        type="tel"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        value={formatNational(national, shown.groups)}
        onChange={(e) => type(e.target.value)}
        placeholder={shown.groups.map((n) => "0".repeat(n)).join(" ") || "…"}
        className={`flex-1 min-w-0 ${field}`}
      />

      {open && (
        <div className={`absolute left-0 top-full z-40 mt-1 max-h-64 w-64 overflow-y-auto rounded-xl border shadow-xl ${panel}`}>
          <div className={`sticky top-0 border-b p-2 ${dark ? "border-gray-700 bg-gray-900" : "border-gray-100 bg-white"}`}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays…"
              className={`w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none ${
                dark
                  ? "border border-gray-700 bg-gray-800 text-white placeholder-gray-500"
                  : "border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400"
              }`}
            />
          </div>
          {filtered.map((c) => (
            <button
              key={`${c.name}-${c.dial}`}
              type="button"
              onClick={() => pick(c)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                dark ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"
              } ${c.name === shown.name ? (dark ? "bg-gray-800" : "bg-emerald-50") : ""}`}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className={dark ? "text-gray-500" : "text-gray-400"}>+{c.dial}</span>
            </button>
          ))}
          {!filtered.length && (
            <p className={`px-3 py-3 text-center text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Aucun pays trouvé — utilise « Autre ».
            </p>
          )}
          <button
            type="button"
            onClick={() => pick(PHONE_OTHER)}
            className={`flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm ${
              dark
                ? "border-gray-700 text-gray-400 hover:bg-gray-800"
                : "border-gray-100 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <span className="text-base leading-none">🌍</span>
            Autre (saisie libre)
          </button>
        </div>
      )}
    </div>
  );
}
