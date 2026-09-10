"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type PType   = "DEPOSIT" | "INSTALLMENT" | "FINAL" | "REFUND";
type PMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHECK" | "OTHER";
type PStatus = "PENDING" | "COMPLETED" | "CANCELLED";
type PayStatus = "paid" | "partial" | "none";

export type SerializedPayment = {
  id: string;
  reservationId: string;
  pilgrimId: string | null;
  amount: number;
  type: PType;
  method: PMethod;
  status: PStatus;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  reservation: {
    id: string;
    totalAmount: number | null;
    offer: { id: string; titleFr: string; currency: string; priceAdult: number };
  };
  pilgrim: { id: string; name: string; phone: string | null; city: string | null } | null;
};

type ReservationOffer = { id: string; titleFr: string; currency: string; priceAdult: number };

type SimplePilgrim = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  pilgrimStatus: string;
  reservations: {
    id: string;
    totalAmount: number | null;
    status: string;
    offer: ReservationOffer;
    payments: SerializedPayment[];
  }[];
};

type SimpleOffer = { id: string; titleFr: string; currency: string; priceAdult: number };

interface PilgrimSummary {
  pilgrim:     SimplePilgrim;
  reservation: SimplePilgrim["reservations"][0] | null;
  payments:    SerializedPayment[];
  total:       number;
  paid:        number;
  remaining:   number;
  pct:         number;
  payStatus:   PayStatus;
  currency:    string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<PType, string> = {
  DEPOSIT:     "Acompte",
  INSTALLMENT: "Versement",
  FINAL:       "Solde final",
  REFUND:      "Remboursement",
};
const TYPE_COLOR: Record<PType, string> = {
  DEPOSIT:     "bg-blue-100 text-blue-700",
  INSTALLMENT: "bg-amber-100 text-amber-700",
  FINAL:       "bg-green-100 text-green-700",
  REFUND:      "bg-red-100 text-red-600",
};
const METHOD_LABEL: Record<PMethod, string> = {
  CASH:          "Espèces",
  BANK_TRANSFER: "Virement",
  MOBILE_MONEY:  "Mobile Money",
  CHECK:         "Chèque",
  OTHER:         "Autre",
};
const STATUS_LABEL: Record<PStatus, string> = {
  PENDING:   "En attente",
  COMPLETED: "Encaissé",
  CANCELLED: "Annulé",
};
const STATUS_COLOR: Record<PStatus, string> = {
  PENDING:   "bg-orange-100 text-orange-600",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-400",
};
const PILGRIM_STATUS_LABELS: Record<string, string> = {
  NOUVEAU:     "Nouveau",
  EN_COURS:    "En cours",
  COMPLET:     "Complet",
  VISA_DEPOSE: "Visa déposé",
  VISA_OK:     "Visa obtenu",
  PARTI:       "En voyage",
  RETOUR:      "Retour",
  CANCELLED:   "Annulé",
  PENDING:     "Nouveau",
  INCOMPLETE:  "En cours",
  REGISTERED:  "Complet",
};
const PILGRIM_STATUS_COLORS: Record<string, string> = {
  NOUVEAU:     "text-gray-400",
  EN_COURS:    "text-orange-500",
  COMPLET:     "text-blue-600",
  VISA_DEPOSE: "text-purple-600",
  VISA_OK:     "text-green-600 font-semibold",
  PARTI:       "text-cyan-600",
  RETOUR:      "text-emerald-600",
  CANCELLED:   "text-red-400",
  PENDING:     "text-gray-400",
  INCOMPLETE:  "text-orange-500",
  REGISTERED:  "text-blue-600",
};

const AVATAR_COLORS = ["#0f5132","#1e40af","#7c3aed","#c2410c","#be185d","#0e7490"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return (p[0][0] ?? "?").toUpperCase();
  return ((p[0][0] ?? "") + (p[p.length - 1][0] ?? "")).toUpperCase();
}
function fmt(n: number, cur: string) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + cur;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  payments:          SerializedPayment[];
  pilgrims:          SimplePilgrim[];
  offers:            SimpleOffer[];
  selectedYear:      number;
  initialPilgrimId?: string;
  initialAction?:    string;
}

export default function FinancesClient({ payments, pilgrims, offers, selectedYear, initialPilgrimId, initialAction }: Props) {
  const router = useRouter();

  const [search,          setSearch]          = useState("");
  const [offerFilter,     setOfferFilter]     = useState("ALL");
  const [payStatusFilter, setPayStatusFilter] = useState("ALL");
  const [selectedId,      setSelectedId]      = useState<string | null>(initialPilgrimId ?? null);
  const [pendingAction,   setPendingAction]   = useState<string | undefined>(initialAction);

  // Clean URL params once consumed (avoid re-triggering on refresh)
  useEffect(() => {
    if (initialPilgrimId) {
      const url = new URL(window.location.href);
      url.searchParams.delete("pilgrimId");
      url.searchParams.delete("action");
      window.history.replaceState(null, "", url.toString());
    }
  }, [initialPilgrimId]);

  const defaultCurrency = offers[0]?.currency ?? "FCFA";

  // ── Group payments by pilgrimId (depuis les pèlerins imbriqués, sans filtre de date)
  // Cela garantit que les paiements PENDING avec paidAt hors de l'année sélectionnée
  // (ex: tranche prévue en janvier N+1 pour un pèlerin de l'année N) sont bien inclus.
  const pmtMap = useMemo(() => {
    const m = new Map<string, SerializedPayment[]>();
    for (const p of pilgrims) {
      const pmts: SerializedPayment[] = [];
      for (const r of p.reservations) {
        pmts.push(...(r.payments ?? []));
      }
      if (pmts.length > 0) {
        pmts.sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
        m.set(p.id, pmts);
      }
    }
    return m;
  }, [pilgrims]);

  // ── Pilgrim summaries ─────────────────────────────────────────────────────
  const summaries = useMemo((): PilgrimSummary[] =>
    pilgrims.map(p => {
      const res      = p.reservations[0] ?? null;
      const currency = res?.offer?.currency ?? defaultCurrency;
      const total    = res?.totalAmount ?? res?.offer?.priceAdult ?? 0;
      const pmts     = (pmtMap.get(p.id) ?? []).sort(
        (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
      );
      const paid = pmts.reduce((s, x) => {
        if (x.status !== "COMPLETED") return s;
        return x.type === "REFUND" ? s - x.amount : s + x.amount;
      }, 0);
      const remaining  = Math.max(0, total - paid);
      const pct        = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
      const payStatus: PayStatus =
        total > 0 && paid >= total ? "paid" : paid > 0 ? "partial" : "none";
      return { pilgrim: p, reservation: res, payments: pmts, total, paid, remaining, pct, payStatus, currency };
    }),
  [pilgrims, pmtMap, defaultCurrency]);

  // ── Global stats ──────────────────────────────────────────────────────────
  // "remaining" = soldes restants à collecter (sum des remainings des pèlerins)
  // "refunded"  = total des remboursements COMPLETED
  // "thisMonth" = nb versements encaissés ce mois-ci
  const stats = useMemo(() => {
    let collected = 0, refunded = 0, thisMonth = 0;
    const bom = new Date();
    bom.setDate(1); bom.setHours(0, 0, 0, 0);
    for (const pmts of pmtMap.values()) {
      for (const p of pmts) {
        if (p.status !== "COMPLETED") continue;
        if (p.type === "REFUND") refunded += p.amount;
        else { collected += p.amount; if (new Date(p.paidAt) >= bom) thisMonth++; }
      }
    }
    return { net: collected - refunded, refunded, thisMonth };
  }, [pmtMap]);

  // Solde restant global = somme des remaining de chaque pèlerin
  const totalRemaining = useMemo(() =>
    summaries.reduce((s, x) => s + x.remaining, 0),
  [summaries]);

  // ── Filtered summaries ────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    summaries.filter(s => {
      const q = search.toLowerCase();
      const ok1 = !q || s.pilgrim.name.toLowerCase().includes(q) || (s.pilgrim.phone ?? "").includes(q);
      const ok2 = offerFilter     === "ALL" || s.reservation?.offer?.id === offerFilter;
      const ok3 = payStatusFilter === "ALL" || s.payStatus === payStatusFilter;
      return ok1 && ok2 && ok3;
    }),
  [summaries, search, offerFilter, payStatusFilter]);

  const selectedSummary = selectedId ? summaries.find(s => s.pilgrim.id === selectedId) ?? null : null;

  return (
    <div className="flex gap-5 w-full min-h-0">

      {/* ── Left — main panel ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "var(--font-playfair,serif)" }}>
              Finances & Paiements
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Suivi des versements par pèlerin
              <span className="ml-2 text-[11px] font-bold bg-[#0f5132]/10 text-[#0f5132] px-2 py-0.5 rounded-full">
                {selectedYear}
              </span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net encaissé"  value={fmt(stats.net, defaultCurrency)}     sub={`${payments.filter(p=>p.status==="COMPLETED"&&p.type!=="REFUND").length} versements`} accent="text-green-600"  bg="bg-green-50"  icon={<MoneyIcon />} />
          <StatCard title="Reste à collecter" value={fmt(totalRemaining, defaultCurrency)} sub="Soldes restants des pèlerins" accent="text-orange-500" bg="bg-orange-50" icon={<ClockIcon />} />
          <StatCard title="Remboursements" value={fmt(stats.refunded, defaultCurrency)} sub="Résiliations"            accent="text-red-500"    bg="bg-red-50"    icon={<RefundIcon />} />
          <StatCard title="Ce mois"       value={`${stats.thisMonth}`}                sub="versements encaissés"      accent="text-blue-600"   bg="bg-blue-50"   icon={<CalIcon />} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Rechercher un pèlerin…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition" />
          </div>

          <select value={offerFilter} onChange={e => setOfferFilter(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 text-gray-600 cursor-pointer transition">
            <option value="ALL">Toutes les offres</option>
            {offers.map(o => <option key={o.id} value={o.id}>{o.titleFr}</option>)}
          </select>

          <select value={payStatusFilter} onChange={e => setPayStatusFilter(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 text-gray-600 cursor-pointer transition">
            <option value="ALL">Tous statuts</option>
            <option value="paid">Soldé</option>
            <option value="partial">Partiel</option>
            <option value="none">Non payé</option>
          </select>

          <span className="text-gray-400 text-xs ml-1">{filtered.length} pèlerin{filtered.length > 1 ? "s" : ""}</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-gray-400 px-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Soldé</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Paiement partiel</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> Non payé</span>
        </div>

        {/* Pilgrim grid */}
        {filtered.length === 0 ? (
          <EmptyState year={selectedYear} />
        ) : (
          <div className={`grid gap-4 ${selectedSummary ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
            {filtered.map(s => (
              <PilgrimPayCard
                key={s.pilgrim.id}
                summary={s}
                selected={selectedId === s.pilgrim.id}
                onClick={() => setSelectedId(selectedId === s.pilgrim.id ? null : s.pilgrim.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right — Pilgrim detail drawer ── */}
      {selectedSummary && (
        <PilgrimDrawer
          summary={selectedSummary}
          initialAction={pendingAction}
          onActionConsumed={() => setPendingAction(undefined)}
          onClose={() => setSelectedId(null)}
          onRefresh={() => { setSelectedId(null); router.refresh(); }}
          onRefreshKeepSelected={() => router.refresh()}
        />
      )}
    </div>
  );
}

// ─── PilgrimPayCard ───────────────────────────────────────────────────────────

const PAY_CARD: Record<PayStatus, string> = {
  paid:    "border-l-green-500 bg-green-50/60",
  partial: "border-l-orange-400 bg-orange-50/40",
  none:    "border-l-gray-200 bg-white",
};
const PAY_BAR: Record<PayStatus, string> = {
  paid: "bg-green-500", partial: "bg-orange-400", none: "bg-gray-200",
};

function PilgrimPayCard({ summary, selected, onClick }: {
  summary:  PilgrimSummary;
  selected: boolean;
  onClick:  () => void;
}) {
  const { pilgrim, reservation, payments, paid, total, remaining, pct, payStatus, currency } = summary;

  return (
    <button onClick={onClick}
      className={`text-left w-full rounded-2xl border border-gray-100 border-l-4 p-4 shadow-sm transition-all hover:shadow-md active:scale-[.99] ${PAY_CARD[payStatus]} ${selected ? "ring-2 ring-[#0f5132]/40 shadow-md" : ""}`}>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
          style={{ backgroundColor: avatarColor(pilgrim.name) }}>
          {initials(pilgrim.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{pilgrim.name}</p>
          <p className="text-gray-400 text-[11px] mt-0.5 truncate">
            {reservation?.offer?.titleFr ?? "—"}
          </p>
        </div>
        <PayStatusBadge status={payStatus} />
      </div>

      {/* Progress */}
      {total > 0 ? (
        <div className="space-y-2">
          {/* Barre de progression */}
          <div className="w-full h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${PAY_BAR[payStatus]}`}
              style={{ width: `${pct}%` }} />
          </div>

          {/* Versé / Total */}
          <div className="flex items-center justify-between text-[11px]">
            <span className={`font-semibold ${payStatus === "paid" ? "text-green-600" : payStatus === "partial" ? "text-orange-500" : "text-gray-400"}`}>
              {fmt(paid, currency)} versé
            </span>
            <span className="text-gray-400 font-medium">{fmt(total, currency)}</span>
          </div>

          {/* Reste à payer — mis en avant */}
          {remaining > 0 ? (
            <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-orange-500 font-medium">Reste à payer</span>
              <span className="text-[12px] font-black text-orange-600">{fmt(remaining, currency)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
              <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[11px] text-green-600 font-semibold">Intégralement soldé</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-300 text-xs">Aucune réservation</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[10px] text-gray-400">
          {payments.length} versement{payments.length > 1 ? "s" : ""}
        </span>
        <span className={`text-[10px] ${PILGRIM_STATUS_COLORS[pilgrim.pilgrimStatus] ?? "text-gray-400"}`}>
          {PILGRIM_STATUS_LABELS[pilgrim.pilgrimStatus] ?? pilgrim.pilgrimStatus}
        </span>
      </div>
    </button>
  );
}

// ─── PilgrimDrawer ────────────────────────────────────────────────────────────

function PilgrimDrawer({ summary, initialAction, onActionConsumed, onClose, onRefresh, onRefreshKeepSelected }: {
  summary:               PilgrimSummary;
  initialAction?:        string;
  onActionConsumed?:     () => void;
  onClose:               () => void;
  onRefresh:             () => void;
  onRefreshKeepSelected: () => void;
}) {
  const { pilgrim, reservation, payments, paid, total, remaining, pct, payStatus, currency } = summary;

  const [showModal,        setShowModal]        = useState(false);
  const [editPayment,      setEditPayment]      = useState<SerializedPayment | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<PType>("DEPOSIT");
  const [deleteTarget,     setDeleteTarget]     = useState<SerializedPayment | null>(null);
  const [deleting,         setDeleting]         = useState(false);
  const [typeFilter,       setTypeFilter]       = useState("ALL");

  // Auto-open modal when navigating from another page with an action param
  useEffect(() => {
    if (!initialAction || !reservation) return;
    if (initialAction === "payment" && payStatus !== "paid") {
      setEditPayment(null);
      setModalDefaultType("DEPOSIT");
      setShowModal(true);
    } else if (initialAction === "refund" && payments.length > 0) {
      setEditPayment(null);
      setModalDefaultType("REFUND");
      setShowModal(true);
    }
    onActionConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPayment() {
    setEditPayment(null);
    setModalDefaultType("DEPOSIT");
    setShowModal(true);
  }
  function openRefund() {
    setEditPayment(null);
    setModalDefaultType("REFUND");
    setShowModal(true);
  }

  const filteredPmts = useMemo(() =>
    payments.filter(p => typeFilter === "ALL" || p.type === typeFilter),
  [payments, typeFilter]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agency-admin/payments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { setDeleteTarget(null); onRefreshKeepSelected(); }
    } finally { setDeleting(false); }
  }

  return (
    <div className="w-[440px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sticky top-0 self-start" style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: avatarColor(pilgrim.name) }}>
          {initials(pilgrim.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm leading-tight truncate">{pilgrim.name}</p>
          <p className="text-gray-400 text-[11px] truncate">{reservation?.offer?.titleFr ?? "Aucune réservation"}</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress summary */}
      {total > 0 && (
        <div className={`px-5 py-4 border-b border-gray-100 ${payStatus === "paid" ? "bg-green-50" : payStatus === "partial" ? "bg-orange-50/60" : "bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Progression</span>
            <span className={`text-lg font-black ${payStatus === "paid" ? "text-green-600" : payStatus === "partial" ? "text-orange-500" : "text-gray-400"}`}>
              {pct}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${PAY_BAR[payStatus]}`}
              style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`rounded-xl px-2 py-2 ${payStatus === "paid" ? "bg-green-100" : "bg-white"}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Versé</p>
              <p className={`font-bold text-sm mt-0.5 ${payStatus === "paid" ? "text-green-700" : "text-gray-800"}`}>{fmt(paid, currency)}</p>
            </div>
            <div className={`rounded-xl px-2 py-2 ${remaining > 0 ? "bg-orange-50" : "bg-white"}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Reste</p>
              <p className={`font-bold text-sm mt-0.5 ${remaining > 0 ? "text-orange-500" : "text-green-600"}`}>{fmt(remaining, currency)}</p>
            </div>
            <div className="rounded-xl px-2 py-2 bg-white">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
              <p className="font-bold text-sm mt-0.5 text-gray-800">{fmt(total, currency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* CTA buttons */}
      {reservation && (
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
          {/* Paiement normal — désactivé si entièrement soldé */}
          <button
            onClick={openPayment}
            disabled={payStatus === "paid"}
            title={payStatus === "paid" ? "Ce pèlerin a déjà soldé intégralement son forfait" : undefined}
            className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition shadow-sm ${
              payStatus === "paid"
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-[#0f5132] hover:bg-[#0d4429] active:scale-95 text-white"
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {payStatus === "paid" ? "Paiement complet ✓" : "Enregistrer un paiement"}
          </button>

          {/* Remboursement — toujours dispo si au moins un paiement existe */}
          {payments.length > 0 && (
            <button
              onClick={openRefund}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 active:scale-95 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Enregistrer un remboursement
            </button>
          )}
        </div>
      )}

      {/* Payment history */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Historique · {payments.length} versement{payments.length > 1 ? "s" : ""}
          </p>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-[11px] py-1 px-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0f5132]/30 text-gray-500 cursor-pointer">
            <option value="ALL">Tous types</option>
            {(["DEPOSIT","INSTALLMENT","FINAL","REFUND"] as PType[]).map(t =>
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>

        {filteredPmts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">Aucun paiement enregistré</p>
            {reservation && (
              <p className="text-gray-300 text-xs mt-1">Cliquez sur le bouton ci-dessus pour en ajouter un</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPmts.map(p => (
              <PaymentItem
                key={p.id}
                payment={p}
                currency={currency}
                onEdit={() => { setEditPayment(p); setModalDefaultType(p.type); setShowModal(true); }}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && reservation && (
        <PaymentModal
          payment={editPayment}
          defaultType={modalDefaultType}
          pilgrim={pilgrim}
          reservation={reservation}
          remainingAmount={remaining}
          paidAmount={paid}
          totalAmount={total}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefreshKeepSelected(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <p className="font-bold text-gray-800 text-sm mb-1">Supprimer ce paiement ?</p>
            <p className="text-gray-500 text-sm mb-1">{fmt(deleteTarget.amount, currency)} — {TYPE_LABEL[deleteTarget.type]}</p>
            <p className="text-gray-400 text-xs mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 px-4 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-60">
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PaymentItem ──────────────────────────────────────────────────────────────

function PaymentItem({ payment: p, currency, onEdit, onDelete }: {
  payment:  SerializedPayment;
  currency: string;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const isRefund = p.type === "REFUND";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${isRefund ? "bg-red-50 border-red-100" : p.status === "PENDING" ? "bg-orange-50/60 border-orange-100" : "bg-gray-50 border-gray-100"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLOR[p.type]}`}>
            {TYPE_LABEL[p.type]}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[p.status]}`}>
            {STATUS_LABEL[p.status]}
          </span>
        </div>
        <p className={`font-bold text-sm mt-1.5 ${isRefund ? "text-red-600" : "text-gray-900"}`}>
          {isRefund ? "−" : ""}{fmt(p.amount, currency)}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {fmtDate(p.paidAt)}
          {" · "}{METHOD_LABEL[p.method]}
          {p.reference && <span className="font-mono"> · {p.reference}</span>}
        </p>
        {p.notes && <p className="text-[11px] text-gray-400 italic mt-0.5">{p.notes}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <a href={`/agency-admin/receipt/${p.id}`} target="_blank" rel="noopener noreferrer"
          title="Voir le reçu"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </a>
        <button onClick={onEdit} title="Modifier"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#0f5132] hover:bg-[#0f5132]/10 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={onDelete} title="Supprimer"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── PaymentModal (pèlerin déjà connu) ───────────────────────────────────────

type DrawerReservation = SimplePilgrim["reservations"][0];

function round1k(n: number) { return Math.max(1000, Math.round(n / 1000) * 1000); }

function PaymentModal({ payment, defaultType, pilgrim, reservation, remainingAmount, paidAmount, totalAmount, onClose, onSaved }: {
  payment:         SerializedPayment | null;
  defaultType:     PType;
  pilgrim:         SimplePilgrim;
  reservation:     DrawerReservation;
  remainingAmount: number;
  paidAmount:      number;
  totalAmount:     number;
  onClose:         () => void;
  onSaved:         () => void;
}) {
  const isEdit     = !!payment;
  const isRefund   = defaultType === "REFUND";
  const [amount,    setAmount]    = useState(payment ? String(payment.amount) : "");
  const [type,      setType]      = useState<PType>(payment?.type ?? defaultType);
  const [method,    setMethod]    = useState<PMethod>(payment?.method ?? "CASH");
  const [status,    setStatus]    = useState<PStatus>(payment?.status ?? "COMPLETED");
  const [reference] = useState(payment?.reference ?? "");
  const [notes,     setNotes]     = useState(payment?.notes ?? "");
  const [paidAt,    setPaidAt]    = useState(
    payment ? new Date(payment.paidAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const currency = reservation.offer.currency;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr("Montant invalide"); return; }
    setSaving(true);
    try {
      const body = {
        reservationId: reservation.id,
        pilgrimId:     pilgrim.id,
        amount: amt, type, method, status: "COMPLETED",
        reference: reference || null,
        notes:     notes     || null,
        paidAt,
      };
      const url    = isEdit ? `/api/agency-admin/payments/${payment!.id}` : "/api/agency-admin/payments";
      const meth   = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method: meth, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Erreur"); return; }
      onSaved();
    } catch { setErr("Erreur réseau"); }
    finally   { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header — rouge si remboursement */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isRefund ? "border-red-100 bg-red-50" : "border-gray-100"}`}>
          <div>
            <h2 className={`font-bold text-base ${isRefund ? "text-red-600" : "text-gray-800"}`}>
              {isEdit
                ? "Modifier le paiement"
                : isRefund ? "Enregistrer un remboursement" : "Enregistrer un paiement"}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">{pilgrim.name} · {reservation.offer.titleFr}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Forfait + état actuel */}
        {totalAmount > 0 && (
          <div className="mx-6 mt-4 grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Forfait</p>
              <p className="text-xs font-bold text-gray-700 mt-0.5">{fmt(totalAmount, currency)}</p>
            </div>
            <div className="bg-green-50 rounded-xl px-3 py-2 text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Versé</p>
              <p className="text-xs font-bold text-green-700 mt-0.5">{fmt(paidAmount, currency)}</p>
            </div>
            <div className={`rounded-xl px-3 py-2 text-center ${remainingAmount > 0 ? "bg-orange-50" : "bg-green-50"}`}>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Reste</p>
              <p className={`text-xs font-bold mt-0.5 ${remainingAmount > 0 ? "text-orange-600" : "text-green-600"}`}>
                {remainingAmount > 0 ? fmt(remainingAmount, currency) : "Soldé ✓"}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Montant + boutons rapides */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Montant</label>
              <input type="number" min={1} step="any" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Ex : 500 000" autoFocus
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 ${isRefund ? "border-red-200 focus:ring-red-200 focus:border-red-400" : "border-gray-200 focus:ring-[#0f5132]/30 focus:border-[#0f5132]"}`} />
              {/* Raccourcis montant */}
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {!isRefund && remainingAmount > 0 && (
                  <button type="button" onClick={() => setAmount(String(remainingAmount))}
                    className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100 transition font-semibold">
                    Reste
                  </button>
                )}
                {!isRefund && remainingAmount > 0 && (
                  <button type="button" onClick={() => setAmount(String(round1k(remainingAmount / 2)))}
                    className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition font-semibold">
                    ½ reste
                  </button>
                )}
                {!isRefund && totalAmount > 0 && (
                  <button type="button" onClick={() => setAmount(String(round1k(totalAmount * 0.3)))}
                    className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-md hover:bg-purple-100 transition font-semibold">
                    30%
                  </button>
                )}
                {isRefund && paidAmount > 0 && (
                  <button type="button" onClick={() => setAmount(String(paidAmount))}
                    className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition font-semibold">
                    Total versé
                  </button>
                )}
                {isRefund && paidAmount > 0 && (
                  <button type="button" onClick={() => setAmount(String(round1k(paidAmount / 2)))}
                    className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 border border-red-100 rounded-md hover:bg-red-100 transition font-semibold">
                    50%
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as PType)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 bg-white">
                {(["DEPOSIT","INSTALLMENT","FINAL","REFUND"] as PType[]).map(t =>
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>

          {/* Méthode de paiement */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Méthode de paiement</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(["CASH","BANK_TRANSFER","MOBILE_MONEY","CHECK","OTHER"] as PMethod[]).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`py-2 px-1 text-[10px] font-semibold rounded-xl border transition text-center ${method === m ? "bg-[#0f5132] text-white border-[#0f5132]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Date + référence (auto-générée par le système) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
              <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Référence / Reçu</label>
              {payment?.reference ? (
                // Édition : la référence existante est conservée (lecture seule)
                <div className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-mono">
                  {payment.reference}
                </div>
              ) : (
                // Création : générée automatiquement par l'API
                <div className="w-full px-3 py-2 text-sm bg-[#0f5132]/5 border border-[#0f5132]/20 rounded-xl text-[#0f5132] flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-semibold">Auto-générée (REC-{new Date().getFullYear()}-XXXXX)</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Remarques…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 resize-none" />
          </div>

          {err && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-xl transition disabled:opacity-60 ${isRefund ? "bg-red-600 hover:bg-red-700" : "bg-[#0f5132] hover:bg-[#0d4429]"}`}>
              {saving ? "Enregistrement..." : isEdit ? "Modifier" : isRefund ? "Rembourser" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function PayStatusBadge({ status }: { status: PayStatus }) {
  if (status === "paid")    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">Soldé</span>;
  if (status === "partial") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 flex-shrink-0">Partiel</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">Non payé</span>;
}

function StatCard({ title, value, sub, accent, bg, icon }: { title: string; value: string; sub: string; accent: string; bg: string; icon: React.ReactNode }) {
  return (
    <div className={`${bg} rounded-2xl p-5 flex items-start gap-4 border border-white shadow-sm`}>
      <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs font-medium">{title}</p>
        <p className={`text-xl font-black mt-0.5 leading-tight ${accent}`}>{value}</p>
        <p className="text-gray-400 text-[11px] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function EmptyState({ year }: { year: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center gap-4">
      <div className="w-16 h-16 bg-[#0f5132]/10 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-[#0f5132]/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold">Aucun pèlerin en {year}</p>
        <p className="text-gray-400 text-sm mt-1">Vérifiez l&apos;année sélectionnée dans le menu du haut</p>
      </div>
    </div>
  );
}

function MoneyIcon()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function ClockIcon()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function RefundIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>; }
function CalIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
