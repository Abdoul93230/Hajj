import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type ProgramFlight = {
  airline?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
};
type ProgramHotel = { name?: string; city?: string; nights?: number };
type ProgramDay = { day?: string; title?: string; description?: string };
type OfferProgramData = {
  maxCapacity?: number;
  flights?: ProgramFlight[];
  hotels?: ProgramHotel[];
  program?: ProgramDay[];
  included?: string[];
};

type Props = { params: Promise<{ locale: string }> };

export default async function MonProgrammePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("portal");
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") redirect(`/${locale}/compte`);

  const reservations = await prisma.reservation.findMany({
    where: { tenantId: session.tenantId, userId: session.id, status: { not: "CANCELLED" } },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, phone: true, theme: true },
  });

  const localeTag = locale === "ar" ? "ar" : locale === "en" ? "en" : "fr";
  const fmtDate = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "long", year: "numeric" }).format(d)
      : null;

  const theme = (tenant?.theme ?? {}) as { whatsappNumber?: string };
  const agencyPhone = theme.whatsappNumber ?? tenant?.phone ?? null;
  const now = new Date();

  return (
    <div className="space-y-6">
      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">{t("program.empty")}</p>
        </div>
      ) : (
        reservations.map((r) => {
          const data = (r.offer.data ?? {}) as OfferProgramData;
          const hasProgram =
            (data.program?.length ?? 0) > 0 ||
            (data.flights?.length ?? 0) > 0 ||
            (data.hotels?.length ?? 0) > 0 ||
            (data.included?.length ?? 0) > 0;

          const dep = r.offer.departureDate;
          const ret = r.offer.returnDate;
          const daysToDeparture = dep
            ? Math.ceil((dep.getTime() - now.getTime()) / 86400000)
            : null;
          const duration =
            dep && ret ? Math.round((ret.getTime() - dep.getTime()) / 86400000) : null;
          const isOngoing = dep && ret ? dep <= now && now <= ret : false;
          const isFinished = ret ? ret < now : false;

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* ── En-tête voyage ── */}
              <div className="bg-[#06251a] text-white p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold">{r.offer.titleFr}</h2>
                    <p className="text-white/60 text-sm mt-1">
                      {t("program.departure")} : {fmtDate(dep) ?? "—"}
                      {ret && (
                        <>
                          {" · "}
                          {t("program.return")} : {fmtDate(ret)}
                        </>
                      )}
                      {duration && duration > 0 && (
                        <span className="text-white/40"> · {t("program.duration", { days: duration })}</span>
                      )}
                    </p>
                  </div>
                  {daysToDeparture !== null && daysToDeparture > 0 && (
                    <span className="bg-amber-400 text-[#06251a] text-sm font-black px-4 py-2 rounded-xl">
                      {t("program.countdown", { days: daysToDeparture })}
                    </span>
                  )}
                  {isOngoing && (
                    <span className="bg-cyan-400 text-[#06251a] text-sm font-black px-4 py-2 rounded-xl">
                      ✈ {t("program.departed")}
                    </span>
                  )}
                  {isFinished && (
                    <span className="bg-emerald-400 text-[#06251a] text-sm font-black px-4 py-2 rounded-xl">
                      ✓ {t("program.finished")}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {!hasProgram && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {t("program.noProgram")}
                  </p>
                )}

                {/* ── Vols ── */}
                {(data.flights?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      ✈ {t("program.flights")}
                    </p>
                    <div className="space-y-2">
                      {data.flights!.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm"
                        >
                          <span className="font-semibold text-gray-800">
                            {f.airline ?? "—"} {f.flightNo ? `· ${f.flightNo}` : ""}
                          </span>
                          <span className="text-gray-600">
                            {f.from ?? "—"} → {f.to ?? "—"}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {f.date ?? ""} {f.time ?? ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Hôtels ── */}
                {(data.hotels?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      🏨 {t("program.hotels")}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {data.hotels!.map((h, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
                        >
                          <p className="font-semibold text-gray-800 text-sm">{h.name ?? "—"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {h.city ?? "—"}
                            {h.nights ? ` · ${t("program.nights", { n: h.nights })}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Programme jour par jour ── */}
                {(data.program?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      🗓️ {t("program.daily")}
                    </p>
                    <div className="space-y-3">
                      {data.program!.map((d, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex-shrink-0 w-14 text-center">
                            <div className="bg-[#0f5132]/10 text-[#0f5132] rounded-lg py-1.5 px-1">
                              <p className="text-[9px] font-semibold uppercase leading-none">
                                {t("program.day")}
                              </p>
                              <p className="text-sm font-black leading-tight">{d.day ?? i + 1}</p>
                            </div>
                          </div>
                          <div className="flex-1 border-l-2 border-gray-100 pl-3">
                            <p className="font-semibold text-gray-800 text-sm">{d.title ?? "—"}</p>
                            {d.description && (
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                {d.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Inclus ── */}
                {(data.included?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      ✓ {t("program.included")}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {data.included!.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500 font-bold">✓</span> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Contacts ── */}
                {agencyPhone && (
                  <div className="rounded-xl bg-[#0f5132]/5 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {t("program.contacts")} — {tenant?.name}
                    </span>
                    <a
                      href={`tel:${agencyPhone.replace(/\s+/g, "")}`}
                      className="bg-[#0f5132] hover:bg-[#0d4429] text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                    >
                      📞 {t("program.callAgency")}
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
