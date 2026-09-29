import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CreditCard,
  FileCheck2,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Plane,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

/*
 * LANDING DE LA PLATEFORME (page unique, ancrée).
 * Contenu 100 % i18n : namespace « platform » (src/messages/<locale>/platform.json).
 * Les ancres (#features, #how, …) sont celles de PlatformHeader / PlatformFooter.
 */

const LOCALES = routing.locales as readonly string[];

type Feature = { title: string; desc: string };
type Step = { title: string; desc: string };
type Audience = { title: string; desc: string; points: string[] };
type Plan = { name: string; tagline: string; points: string[] };
type Faq = { q: string; a: string };

const FEATURE_ICONS = [Users, Plane, CreditCard, FileCheck2, QrCode, MessageSquare];
const TRUST_ICONS = [Globe, Sparkles, ShieldCheck, BarChart3];
const AUDIENCE_ICONS = [Building2, Users, LayoutDashboard];

export default async function PlatformLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "platform" });

  // Listes : `t.raw` renvoie la structure JSON telle quelle (titres + paragraphes).
  const features = t.raw("features.items") as Feature[];
  const steps = t.raw("how.steps") as Step[];
  const plans = t.raw("plans.items") as Plan[];
  const faqs = t.raw("faq.items") as Faq[];
  const audienceAgency = t.raw("audiences.agency") as Audience;
  const audiencePilgrim = t.raw("audiences.pilgrim") as Audience;
  const audiencePlatform = t.raw("audiences.platform") as Audience;

  const trust = [
    { title: t("trust.multiTitle"), desc: t("trust.multiDesc") },
    { title: t("trust.brandTitle"), desc: t("trust.brandDesc") },
    { title: t("trust.i18nTitle"), desc: t("trust.i18nDesc") },
    { title: t("trust.dataTitle"), desc: t("trust.dataDesc") },
  ];

  const domains = [
    { title: t("domains.publicTitle"), desc: t("domains.publicDesc"), host: "agence.hajj-e.com" },
    {
      title: t("domains.adminTitle"),
      desc: t("domains.adminDesc"),
      host: "dashboard.agence.hajj-e.com",
    },
    { title: t("domains.customTitle"), desc: t("domains.customDesc"), host: "mon-agence.com" },
  ];

  const contactEmail = process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "contact@hajj-e.com";

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-20 w-[32rem] h-[32rem] rounded-full bg-gold-light/15 blur-3xl"
        />
        <div className="relative max-w-6xl mx-auto px-5 py-16 sm:py-24 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-gold-light">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
              {t("hero.badge")}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.05] tracking-tight [font-family:var(--font-playfair)]">
              {t("hero.title")} <span className="text-gold-light">{t("hero.titleAccent")}</span>{" "}
              {t("hero.titleSuffix")}
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-white/70 max-w-xl">
              {t("hero.subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <NextLink
                href="/agency-admin/login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-brand-deep bg-gold-light hover:bg-gold transition-colors"
              >
                {t("hero.ctaPrimary")}
                <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
              </NextLink>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>

            <p className="mt-6 text-xs text-white/45 leading-relaxed max-w-md">{t("hero.note")}</p>
          </div>

          {/* Aperçu produit (pur HTML/CSS, aucune image) */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-6 rounded-[3rem] bg-gold-light/10 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur p-5 shadow-2xl">
              <div className="flex items-center gap-1.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="ml-auto text-[10px] font-black uppercase tracking-[0.18em] text-gold-light">
                  HajjManager Pro
                </span>
              </div>

              <ul className="space-y-2.5">
                {features.slice(0, 4).map((f) => (
                  <li
                    key={f.title}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5"
                  >
                    <span className="w-7 h-7 rounded-lg bg-gold-light/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-gold-light" strokeWidth={2.6} />
                    </span>
                    <span className="text-sm text-white/85 truncate">{f.title}</span>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gold-light/70">
                      OK
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl bg-white/[0.04] border border-white/5 px-3 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-white/70" strokeWidth={2} />
                </span>
                <span className="text-xs text-white/60 truncate">dashboard.agence.hajj-e.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILIERS ──────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-5 py-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item, i) => {
            const Icon = TRUST_ICONS[i] ?? ShieldCheck;
            return (
              <div key={item.title} className="flex gap-3">
                <span className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-bold text-ink text-sm">{item.title}</p>
                  <p className="text-ink-muted text-sm leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ──────────────────────────────────────────────── */}
      <section id="features" className="bg-cream scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <header className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight [font-family:var(--font-playfair)]">
              {t("features.title")}
            </h2>
            <p className="mt-3 text-ink-muted leading-relaxed">{t("features.subtitle")}</p>
          </header>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Users;
              return (
                <article
                  key={f.title}
                  className="bg-white rounded-2xl border border-line p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <span className="w-11 h-11 rounded-xl bg-brand-deep flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-gold-light" strokeWidth={2} />
                  </span>
                  <h3 className="font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted leading-relaxed">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────────────────── */}
      <section id="how" className="bg-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <header className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight [font-family:var(--font-playfair)]">
              {t("how.title")}
            </h2>
            <p className="mt-3 text-ink-muted leading-relaxed">{t("how.subtitle")}</p>
          </header>

          <ol className="grid gap-6 lg:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-line bg-surface-muted p-6 pt-8">
                <span className="absolute -top-3 left-6 w-8 h-8 rounded-lg bg-gold text-white font-black text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── POUR QUI ─────────────────────────────────────────────────────── */}
      <section id="audiences" className="bg-brand-deep text-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <header className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight [font-family:var(--font-playfair)]">
              {t("audiences.title")}
            </h2>
            <p className="mt-3 text-white/65 leading-relaxed">{t("audiences.subtitle")}</p>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            {[audienceAgency, audiencePilgrim, audiencePlatform].map((a, i) => {
              const Icon = AUDIENCE_ICONS[i] ?? Users;
              return (
                <div
                  key={a.title}
                  className="rounded-2xl bg-white/[0.05] border border-white/10 p-6"
                >
                  <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-gold-light" strokeWidth={2} />
                  </span>
                  <h3 className="font-bold text-white">{a.title}</h3>
                  <p className="mt-1.5 text-sm text-white/60">{a.desc}</p>
                  <ul className="mt-4 space-y-2">
                    {a.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-white/80">
                        <Check
                          className="w-4 h-4 text-gold-light flex-shrink-0 mt-0.5"
                          strokeWidth={2.6}
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MARQUE BLANCHE / DOMAINES ────────────────────────────────────── */}
      <section id="domains" className="bg-cream scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <header className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight [font-family:var(--font-playfair)]">
              {t("domains.title")}
            </h2>
            <p className="mt-3 text-ink-muted leading-relaxed">{t("domains.subtitle")}</p>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            {domains.map((d) => (
              <article
                key={d.title}
                className="bg-white rounded-2xl border border-line overflow-hidden"
              >
                <div className="px-4 py-3 bg-brand-deep flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gold-light flex-shrink-0" strokeWidth={2} />
                  <span className="text-xs text-white/80 truncate" dir="ltr">
                    {d.host}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-ink">{d.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted leading-relaxed">{d.desc}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-6 text-xs text-ink-soft leading-relaxed max-w-3xl">{t("domains.note")}</p>
        </div>
      </section>

      {/* ── FORMULES ─────────────────────────────────────────────────────── */}
      <section id="plans" className="bg-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <header className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight [font-family:var(--font-playfair)]">
              {t("plans.title")}
            </h2>
            <p className="mt-3 text-ink-muted leading-relaxed">{t("plans.subtitle")}</p>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((p, i) => (
              <article
                key={p.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  i === 1 ? "border-gold bg-cream shadow-lg" : "border-line bg-white"
                }`}
              >
                {i === 1 && (
                  <span className="self-start mb-3 px-2.5 py-1 rounded-full bg-gold text-white text-[10px] font-black uppercase tracking-wider">
                    {t("plans.badge")}
                  </span>
                )}
                <h3 className="text-lg font-black text-ink [font-family:var(--font-playfair)]">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">{p.tagline}</p>

                <ul className="mt-5 space-y-2 flex-1">
                  {p.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-ink">
                      <Check
                        className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                        strokeWidth={2.6}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`mailto:${contactEmail}`}
                  className={`mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    i === 1
                      ? "bg-primary text-white hover:bg-primary-dark"
                      : "border border-line text-ink hover:bg-cream"
                  }`}
                >
                  {t("plans.cta")}
                  <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-cream scroll-mt-16">
        <div className="max-w-3xl mx-auto px-5 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight text-center mb-8 [font-family:var(--font-playfair)]">
            {t("faq.title")}
          </h2>

          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-white rounded-2xl border border-line px-5 py-4 open:shadow-md"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="font-bold text-ink text-sm">{f.q}</span>
                  <span className="text-gold text-lg font-black leading-none group-open:rotate-45 transition-transform flex-shrink-0">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-ink-muted leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPEL À L'ACTION ─────────────────────────────────────────────── */}
      <section className="bg-brand-deep text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight [font-family:var(--font-playfair)]">
            {t("cta.title")}
          </h2>
          <p className="mt-4 text-white/65 max-w-xl mx-auto leading-relaxed">{t("cta.subtitle")}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-brand-deep bg-gold-light hover:bg-gold transition-colors"
            >
              {t("cta.primary")}
              <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
            </a>
            <NextLink
              href="/agency-admin/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              {t("cta.secondary")}
            </NextLink>
          </div>
        </div>
      </section>
    </>
  );
}
