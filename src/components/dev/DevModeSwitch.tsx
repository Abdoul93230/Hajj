"use client";

import { usePathname } from "next/navigation";

/**
 * Badge de DÉVELOPPEMENT : bascule entre la landing plateforme et le portail
 * d'une agence sur un même host (localhost). Le middleware intercepte
 * `?__mode=platform|tenant`, pose le cookie « zam_dev_mode » puis redirige vers
 * l'URL nettoyée.
 *
 * En production, le middleware ignore totalement ce paramètre et les layouts ne
 * rendent jamais ce composant (condition `NODE_ENV !== "production"`).
 */
export default function DevModeSwitch({ current }: { current: "platform" | "tenant" }) {
  const pathname = usePathname();

  // On garde le chemin courant : la bascule ramène au même endroit, dans l'autre
  // espace (le middleware nettoie ensuite le paramètre).
  function href(mode: "platform" | "tenant") {
    return `${pathname}?__mode=${mode}`;
  }

  const pill = "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors";

  return (
    <div className="fixed bottom-4 left-4 z-[90] flex items-center gap-1 bg-white/95 border border-line shadow-lg rounded-full p-1">
      <span className="px-1.5 text-[9px] font-black uppercase tracking-widest text-ink-soft">
        Dev
      </span>
      <a
        href={href("platform")}
        title="Voir la landing de la plateforme"
        className={`${pill} ${
          current === "platform"
            ? "bg-brand-deep text-white"
            : "text-ink-muted hover:text-ink hover:bg-cream"
        }`}
      >
        Plateforme
      </a>
      <a
        href={href("tenant")}
        title="Voir le portail de l'agence"
        className={`${pill} ${
          current === "tenant"
            ? "bg-brand-deep text-white"
            : "text-ink-muted hover:text-ink hover:bg-cream"
        }`}
      >
        Agence
      </a>
    </div>
  );
}
