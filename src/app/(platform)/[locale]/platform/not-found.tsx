import Link from "next/link";
import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * 404 de la LANDING plateforme : un chemin du portail (offres, compte…) demandé
 * sur le domaine racine n'existe pas ici — on renvoie vers l'accueil plateforme
 * en rappelant où se trouve le site d'une agence.
 */
export default async function PlatformNotFound() {
  const t = await getTranslations("platform.notFound");

  return (
    <section className="bg-cream min-h-[60vh] flex items-center">
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <span className="w-14 h-14 mx-auto rounded-2xl bg-brand-deep flex items-center justify-center mb-5">
          <Compass className="w-7 h-7 text-gold-light" strokeWidth={2} />
        </span>
        <h1 className="text-2xl font-black text-ink tracking-tight [font-family:var(--font-playfair)]">
          {t("title")}
        </h1>
        <p className="mt-3 text-ink-muted leading-relaxed">{t("desc")}</p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          {t("home")}
        </Link>
      </div>
    </section>
  );
}
