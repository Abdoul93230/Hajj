import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileEditClient from "./ProfileEditClient";

const STEP_ORDER = ["NOUVEAU", "EN_COURS", "COMPLET", "VISA_DEPOSE", "VISA_OK", "PARTI", "RETOUR"];
const LEGACY_STATUS: Record<string, string> = {
  PENDING: "NOUVEAU",
  INCOMPLETE: "EN_COURS",
  REGISTERED: "COMPLET",
};

const STATUS_BADGE: Record<string, string> = {
  NOUVEAU: "bg-gray-100 text-gray-500",
  EN_COURS: "bg-orange-100 text-orange-600",
  COMPLET: "bg-blue-100 text-blue-700",
  VISA_DEPOSE: "bg-purple-100 text-purple-700",
  VISA_OK: "bg-green-100 text-green-700",
  PARTI: "bg-cyan-100 text-cyan-700",
  RETOUR: "bg-emerald-100 text-emerald-700",
};

type Props = { params: Promise<{ locale: string }> };

export default async function MonDossierPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("portal");
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") redirect(`/${locale}/compte`);

  const pilgrim = await prisma.user.findFirst({
    where: { id: session.id, tenantId: session.tenantId, role: "PILGRIM" },
    include: {
      reservations: {
        include: {
          offer: true,
          payments: { orderBy: { paidAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!pilgrim) redirect(`/${locale}/compte`);

  const documents = await prisma.pilgrimDocument.findMany({
    where: { tenantId: session.tenantId, userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, phone: true, theme: true },
  });

  // ── Helpers ──
  const localeTag = locale === "ar" ? "ar" : locale === "en" ? "en" : "fr";
  const fmtDate = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "long", year: "numeric" }).format(d)
      : null;
  const fmtMoney = (n: number, cur: string) =>
    `${new Intl.NumberFormat(localeTag).format(Math.round(n))} ${cur}`;

  const nameParts = pilgrim.name.trim().split(/\s+/);
  const initials =
    nameParts.length === 1
      ? (nameParts[0]?.[0] ?? "?").toUpperCase()
      : ((nameParts[0]?.[0] ?? "") + (nameParts[nameParts.length - 1]?.[0] ?? "")).toUpperCase();

  const rawStatus = LEGACY_STATUS[pilgrim.pilgrimStatus] ?? pilgrim.pilgrimStatus;
  const statusIndex = STEP_ORDER.indexOf(rawStatus);
  const isCancelled = pilgrim.pilgrimStatus === "CANCELLED";

  const hasActiveDoc = (type: string) =>
    documents.some((d) => d.type === type && (d.status === "RECEIVED" || d.status === "VALID"));
  const visaOk =
    ["VISA_OK", "PARTI", "RETOUR"].includes(pilgrim.pilgrimStatus) || hasActiveDoc("VISA");

  const theme = (tenant?.theme ?? {}) as { whatsappNumber?: string };
  const agencyPhone = theme.whatsappNumber ?? tenant?.phone ?? null;

  const docTiles = [
    { label: t("docs.PASSPORT"), ok: pilgrim.hasPassport || hasActiveDoc("PASSPORT") },
    { label: t("docs.CNI"), ok: pilgrim.hasCni || hasActiveDoc("CNI") },
    { label: t("docs.VISA"), ok: visaOk },
  ];

  return (
    <div className="space-y-6">
      {/* ── En-tête : identité + statut ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          {pilgrim.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pilgrim.photoUrl}
              alt={pilgrim.name}
              className="w-16 h-16 rounded-2xl object-cover border border-gray-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#0f5132] text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{pilgrim.name}</h1>
            <p className="text-sm text-gray-500 truncate">{pilgrim.email}</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
              STATUS_BADGE[rawStatus] ?? "bg-gray-100 text-gray-500"
            }`}
          >
            {t(`status.${rawStatus}`)}
          </span>
        </div>

        {/* ── Timeline du dossier ── */}
        {!isCancelled ? (
          <div className="mt-7 flex items-start">
            {STEP_ORDER.map((step, i) => {
              const done = i < statusIndex;
              const current = i === statusIndex;
              return (
                <div key={step} className="flex-1 relative flex flex-col items-center">
                  {i > 0 && (
                    <div
                      className={`absolute top-3 right-1/2 w-full h-0.5 ${
                        i <= statusIndex ? "bg-[#0f5132]" : "bg-gray-200"
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      done
                        ? "bg-[#0f5132] text-white"
                        : current
                          ? "bg-amber-400 text-white ring-4 ring-amber-100"
                          : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-[9px] font-semibold text-center leading-tight ${
                      current ? "text-[#0f5132]" : done ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    {t(`status.${step}`)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {t("statusBannerCancelled")}
          </div>
        )}
      </div>

      {/* ── Mes informations ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t("personal.title")}
          </p>
          <ProfileEditClient
            initial={{
              phone: pilgrim.phone,
              address: pilgrim.address,
              emergencyName: pilgrim.emergencyName,
              emergencyPhone: pilgrim.emergencyPhone,
            }}
          />
        </div>
        <InfoRow label={t("personal.email")} value={pilgrim.email} />
        <InfoRow label={t("personal.phone")} value={pilgrim.phone} />
        <InfoRow
          label={t("personal.birthDate")}
          value={fmtDate(pilgrim.birthDate)}
        />
        <InfoRow
          label={t("personal.city")}
          value={[pilgrim.city, pilgrim.country].filter(Boolean).join(", ") || null}
        />
        <InfoRow label={t("personal.address")} value={pilgrim.address} />
        <InfoRow label={t("personal.profession")} value={pilgrim.profession} />
        <InfoRow
          label={t("personal.emergency")}
          value={
            [pilgrim.emergencyName, pilgrim.emergencyPhone].filter(Boolean).join(" · ") || null
          }
        />
      </div>

      {/* ── Mes voyages + paiements ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
          {t("trips.title")}
        </p>
        {pilgrim.reservations.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">{t("trips.empty")}</p>
        ) : (
          <div className="space-y-5">
            {pilgrim.reservations.map((r) => {
              const total = r.totalAmount ?? r.offer.priceAdult;
              const completed = r.payments.filter((p) => p.status === "COMPLETED");
              const paid = completed.reduce(
                (s, p) => (p.type === "REFUND" ? s - p.amount : s + p.amount),
                0
              );
              const remaining = Math.max(total - paid, 0);
              const pct = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{r.offer.titleFr}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t("trips.departure")} : {fmtDate(r.offer.departureDate) ?? "—"}
                        {" · "}
                        {t("trips.return")} : {fmtDate(r.offer.returnDate) ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        r.status === "CANCELLED"
                          ? "bg-red-100 text-red-600"
                          : "bg-[#0f5132]/10 text-[#0f5132]"
                      }`}
                    >
                      {r.status === "CANCELLED"
                        ? t("trips.cancelled")
                        : t(`category.${r.category}`)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">
                        {t("trips.forfait")} :{" "}
                        <span className="font-semibold text-gray-700">
                          {fmtMoney(total, r.offer.currency)}
                        </span>
                      </span>
                      <span
                        className={`font-bold ${
                          remaining > 0 ? "text-orange-500" : "text-green-600"
                        }`}
                      >
                        {remaining > 0
                          ? `${t("trips.remaining")} : ${fmtMoney(remaining, r.offer.currency)}`
                          : t("trips.settled")}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-[#0f5132] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {completed.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {t("trips.payments")}
                      </p>
                      {completed.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100 gap-2"
                        >
                          <span className="text-gray-600 min-w-0">
                            {t(`paymentType.${p.type}`)} · {t(`paymentMethod.${p.method}`)}
                          </span>
                          <span className="text-right flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`font-bold ${
                                p.type === "REFUND" ? "text-red-500" : "text-gray-800"
                              }`}
                            >
                              {p.type === "REFUND" ? "−" : "+"}
                              {fmtMoney(p.amount, r.offer.currency)}
                            </span>
                            <span className="text-gray-400">{fmtDate(p.paidAt)}</span>
                            <a
                              href={`/${locale}/recu/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t("trips.viewReceipt")}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {completed.length === 0 && (
                    <p className="text-xs text-gray-400 mt-3">{t("trips.noPayments")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Checklist documents ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t("docs.title")}
          </p>
          <a
            href={`/${locale}/compte/mes-documents`}
            className="text-xs font-semibold text-[#0f5132] hover:underline"
          >
            {t("docs.goToDocuments")} →
          </a>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {docTiles.map(({ label, ok }) => (
            <div
              key={label}
              className={`rounded-xl p-3 text-center border ${
                ok ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
              }`}
            >
              <p className={`text-lg mb-0.5 ${ok ? "text-green-500" : "text-gray-300"}`}>
                {ok ? "✓" : "✗"}
              </p>
              <p className={`text-[10px] font-semibold ${ok ? "text-green-600" : "text-gray-400"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact agence ── */}
      {tenant && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            {tenant.name}
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {agencyPhone && (
              <a
                href={`tel:${agencyPhone.replace(/\s+/g, "")}`}
                className="flex items-center gap-2 bg-[#0f5132]/5 hover:bg-[#0f5132]/10 text-[#0f5132] font-semibold px-4 py-2 rounded-xl transition"
              >
                📞 {agencyPhone}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider w-28 flex-shrink-0 mt-0.5 leading-tight">
        {label}
      </span>
      <span className="text-sm text-gray-700 font-medium leading-snug">{value}</span>
    </div>
  );
}
