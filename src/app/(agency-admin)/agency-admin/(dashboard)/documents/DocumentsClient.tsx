"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType   = "PASSPORT" | "CNI" | "VISA" | "PHOTO" | "MEDICAL" | "OTHER";
type DocStatus = "RECEIVED" | "VALID" | "EXPIRED" | "REJECTED";

type PilgrimDoc = {
  id: string;
  type: DocType;
  status: DocStatus;
  label: string | null;
  fileUrl: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
};

type PilgrimRow = {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  gender: string | null;
  pilgrimStatus: string;
  hasPassport: boolean;
  hasCni: boolean;
  documents: PilgrimDoc[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: { value: DocType; label: string; short: string; color: string }[] = [
  { value: "PASSPORT", label: "Passeport",          short: "PASS",  color: "bg-blue-100 text-blue-700" },
  { value: "CNI",      label: "Carte Nationale",    short: "CNI",   color: "bg-violet-100 text-violet-700" },
  { value: "VISA",     label: "Visa",               short: "VISA",  color: "bg-amber-100 text-amber-700" },
  { value: "PHOTO",    label: "Photo d'identité",   short: "PHOTO", color: "bg-pink-100 text-pink-700" },
  { value: "MEDICAL",  label: "Certificat médical", short: "MED",   color: "bg-red-100 text-red-700" },
  { value: "OTHER",    label: "Autre document",     short: "AUTRE", color: "bg-gray-100 text-gray-600" },
];

const DOC_STATUSES: { value: DocStatus; label: string; cls: string }[] = [
  { value: "RECEIVED", label: "Reçu",   cls: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "VALID",    label: "Valide", cls: "bg-green-50 text-green-700 border-green-200" },
  { value: "EXPIRED",  label: "Expiré", cls: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "REJECTED", label: "Rejeté", cls: "bg-red-50 text-red-600 border-red-200" },
];

const PILGRIM_STATUSES: Record<string, { label: string; dot: string; cls: string }> = {
  NOUVEAU:     { label: "Nouveau",      dot: "bg-gray-400",    cls: "bg-gray-100 text-gray-500"    },
  EN_COURS:    { label: "En cours",     dot: "bg-orange-400",  cls: "bg-orange-100 text-orange-600" },
  COMPLET:     { label: "Complet",      dot: "bg-blue-400",    cls: "bg-blue-100 text-blue-600"    },
  VISA_DEPOSE: { label: "Visa déposé",  dot: "bg-purple-500",  cls: "bg-purple-100 text-purple-700" },
  VISA_OK:     { label: "Visa obtenu",  dot: "bg-green-500",   cls: "bg-green-100 text-green-700"  },
  PARTI:       { label: "En voyage",    dot: "bg-cyan-500",    cls: "bg-cyan-100 text-cyan-700"    },
  RETOUR:      { label: "Retour",       dot: "bg-emerald-500", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED:   { label: "Annulé",       dot: "bg-red-400",     cls: "bg-red-100 text-red-600"      },
  PENDING:     { label: "Nouveau",      dot: "bg-gray-400",    cls: "bg-gray-100 text-gray-500"    },
  INCOMPLETE:  { label: "En cours",     dot: "bg-orange-400",  cls: "bg-orange-100 text-orange-600" },
  REGISTERED:  { label: "Complet",      dot: "bg-blue-400",    cls: "bg-blue-100 text-blue-600"    },
};

const REQUIRED: DocType[] = ["PASSPORT", "CNI"];

function docTypeMeta(type: DocType) {
  return DOC_TYPES.find((d) => d.value === type) ?? DOC_TYPES[DOC_TYPES.length - 1];
}
function docStatusMeta(status: DocStatus) {
  return DOC_STATUSES.find((s) => s.value === status) ?? DOC_STATUSES[0];
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function progress(docs: PilgrimDoc[]) {
  const present = new Set(docs.filter((d) => d.status !== "REJECTED").map((d) => d.type));
  const done = REQUIRED.filter((r) => present.has(r)).length;
  return { done, total: REQUIRED.length, pct: Math.round((done / REQUIRED.length) * 100) };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocumentsClient({
  pilgrims,
  selectedYear,
}: {
  pilgrims: PilgrimRow[];
  selectedYear: number;
}) {
  const router = useRouter();
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return pilgrims;
    return pilgrims.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q)
    );
  }, [pilgrims, search]);

  const selected = pilgrims.find((p) => p.id === selectedId) ?? null;

  const stats = useMemo(() => ({
    total:        pilgrims.length,
    withPassport: pilgrims.filter((p) => p.hasPassport).length,
    withCni:      pilgrims.filter((p) => p.hasCni).length,
  }), [pilgrims]);

  function onChanged() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5 w-full h-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Documents Pèlerins</h2>
          <p className="text-sm text-gray-400 mt-0.5">Saison {selectedYear} — Suivi des pièces justificatives</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pèlerins",   value: stats.total,        sub: "inscrits",  color: "bg-gray-50",   bar: "bg-gray-400" },
          { label: "Passeports", value: stats.withPassport, sub: "déposés",   color: "bg-blue-50",   bar: "bg-blue-500" },
          { label: "CNI",        value: stats.withCni,      sub: "déposées",  color: "bg-violet-50", bar: "bg-violet-500" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl px-4 py-3 border border-gray-100`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">{s.label}</p>
              <span className="text-xs text-gray-400">{s.sub}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {s.value}
              <span className="text-sm font-normal text-gray-400 ml-1">/ {stats.total}</span>
            </p>
            <div className="mt-2 h-1 bg-gray-200/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${s.bar} transition-all`}
                style={{ width: stats.total ? `${(s.value / stats.total) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Layout master / detail ── */}
      <div className="flex gap-4 min-h-0 flex-1" style={{ minHeight: "520px" }}>

        {/* ─── Colonne gauche : liste des pèlerins ─── */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Recherche */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0f5132]/20 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
          </div>

          {/* Liste scrollable */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Aucun résultat</p>
            ) : (
              filtered.map((p) => {
                const st  = PILGRIM_STATUSES[p.pilgrimStatus] ?? PILGRIM_STATUSES.PENDING;
                const pg  = progress(p.documents);
                const ini = initials(p.name);
                const active = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${
                      active
                        ? "bg-[#0f5132]/[0.06] border-l-2 border-l-[#0f5132]"
                        : "hover:bg-gray-50/70 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-[#0f5132]/20" : "bg-gray-100"}`}>
                          <span className={`text-[11px] font-bold ${active ? "text-[#0f5132]" : "text-gray-500"}`}>{ini}</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${active ? "text-[#0f5132]" : "text-gray-800"}`}>
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                          <span className="text-[10px] text-gray-400 truncate">{st.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Badges + barre */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        {REQUIRED.map((type) => {
                          const meta = docTypeMeta(type);
                          const has  = p.documents.some((d) => d.type === type && d.status !== "REJECTED");
                          return (
                            <span
                              key={type}
                              className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                                has ? meta.color : "bg-gray-100 text-gray-300"
                              }`}
                            >
                              {meta.short}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pg.pct === 100 ? "bg-green-500" : pg.pct > 33 ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${pg.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{pg.done}/{pg.total}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] text-gray-400">{filtered.length} pèlerin{filtered.length > 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* ─── Panneau droit : détail ─── */}
        <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Sélectionnez un pèlerin</p>
                <p className="text-sm text-gray-400 mt-1">Cliquez sur un pèlerin dans la liste pour voir et gérer ses documents</p>
              </div>
            </div>
          ) : (
            <PilgrimDetail
              pilgrim={selected}
              onAddDoc={() => setAddModalOpen(true)}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>

      {/* ── Modal ajout document ── */}
      {addModalOpen && selected && (
        <AddDocumentModal
          pilgrim={selected}
          onClose={() => setAddModalOpen(false)}
          onSaved={() => { setAddModalOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

// ─── PilgrimDetail ────────────────────────────────────────────────────────────

function PilgrimDetail({
  pilgrim,
  onAddDoc,
  onChanged,
}: {
  pilgrim: PilgrimRow;
  onAddDoc: () => void;
  onChanged: () => void;
}) {
  const st  = PILGRIM_STATUSES[pilgrim.pilgrimStatus] ?? PILGRIM_STATUSES.PENDING;
  const pg  = progress(pilgrim.documents);
  const ini = initials(pilgrim.name);

  return (
    <div className="flex flex-col h-full">
      {/* En-tête pèlerin */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4">
          {pilgrim.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pilgrim.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#0f5132]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#0f5132]">{ini}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-800">{pilgrim.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                {st.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{pilgrim.phone ?? "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progression */}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 mb-1">{pg.done}/{pg.total} docs requis</p>
            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pg.pct === 100 ? "bg-green-500" : pg.pct > 33 ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${pg.pct}%` }}
              />
            </div>
          </div>
          {/* Bouton ajouter */}
          <button
            onClick={onAddDoc}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f5132] text-white text-sm font-semibold rounded-xl hover:bg-[#0d4429] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>
      </div>

      {/* Résumé badges requis */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-50 bg-gray-50/40 flex-shrink-0">
        {REQUIRED.map((type) => {
          const meta = docTypeMeta(type);
          const doc  = pilgrim.documents.find((d) => d.type === type && d.status !== "REJECTED");
          const sm   = doc ? docStatusMeta(doc.status) : null;
          return (
            <div
              key={type}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                doc
                  ? meta.color + " border-current/10"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            >
              <span>{meta.short}</span>
              {sm && (
                <span className={`text-[9px] px-1 py-0.5 rounded border font-bold ${sm.cls}`}>
                  {sm.label}
                </span>
              )}
              {!doc && <span className="text-[9px] opacity-60">manquant</span>}
            </div>
          );
        })}
        {pilgrim.documents.filter((d) => !REQUIRED.includes(d.type)).length > 0 && (
          <span className="text-xs text-gray-400">
            +{pilgrim.documents.filter((d) => !REQUIRED.includes(d.type)).length} autre{pilgrim.documents.filter((d) => !REQUIRED.includes(d.type)).length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Grille documents */}
      <div className="flex-1 overflow-y-auto p-6">
        {pilgrim.documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium text-sm">Aucun document enregistré</p>
            <p className="text-gray-400 text-xs">Cliquez sur « Ajouter » pour uploader le premier document</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pilgrim.documents.map((doc) => (
              <DocCard key={doc.id} doc={doc} onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DocCard ──────────────────────────────────────────────────────────────────

function DocCard({ doc, onChanged }: { doc: PilgrimDoc; onChanged: () => void }) {
  const meta   = docTypeMeta(doc.type);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isPdf   = doc.fileUrl?.toLowerCase().includes(".pdf") || doc.fileUrl?.includes("/raw/");
  const isImage = doc.fileUrl && !isPdf;

  async function changeStatus(status: DocStatus) {
    setUpdating(true);
    try {
      await fetch(`/api/agency-admin/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } finally {
      setUpdating(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer ce document ?")) return;
    setRemoving(true);
    try {
      await fetch(`/api/agency-admin/documents/${doc.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-white overflow-hidden transition ${updating || removing ? "opacity-60" : ""}`}>
      {/* Aperçu fichier */}
      {doc.fileUrl ? (
        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.fileUrl} alt={meta.label} className="w-full h-32 object-cover bg-gray-50 hover:opacity-90 transition" />
          ) : (
            <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-[10px] text-gray-400 font-medium">Voir le PDF</span>
            </div>
          )}
        </a>
      ) : (
        <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2">
          <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-[10px] text-gray-300">Pas de fichier</span>
        </div>
      )}

      <div className="p-3">
        {/* Type + supprimer */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${meta.color}`}>
              {meta.short} — {meta.label}
            </span>
            <p className="text-xs font-semibold text-gray-700 truncate leading-tight">
              {doc.label ?? meta.label}
            </p>
            {doc.expiresAt && (
              <p className="text-[10px] text-gray-400">
                Expire le {new Date(doc.expiresAt).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <button
            onClick={remove}
            disabled={removing}
            className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sélecteur statut */}
        <div className="flex gap-1 flex-wrap">
          {DOC_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => changeStatus(s.value)}
              disabled={updating || doc.status === s.value}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition ${
                doc.status === s.value
                  ? s.cls + " cursor-default"
                  : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {doc.notes && (
          <p className="mt-1.5 text-[10px] text-gray-400 italic truncate">{doc.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── AddDocumentModal ─────────────────────────────────────────────────────────

function AddDocumentModal({
  pilgrim,
  onClose,
  onSaved,
}: {
  pilgrim: PilgrimRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    type:      "PASSPORT" as DocType,
    status:    "RECEIVED" as DocStatus,
    label:     "",
    expiresAt: "",
    notes:     "",
  });
  const [submitting, setSubmitting]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError]               = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickFile(f: File) {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) { setError("Veuillez sélectionner un fichier."); return; }
    setSubmitting(true);
    setUploadProgress(10);
    try {
      const fd = new FormData();
      fd.append("file",    file);
      fd.append("userId",  pilgrim.id);
      fd.append("type",    form.type);
      fd.append("status",  form.status);
      if (form.label.trim())  fd.append("label",     form.label.trim());
      if (form.expiresAt)     fd.append("expiresAt", form.expiresAt);
      if (form.notes.trim())  fd.append("notes",     form.notes.trim());
      setUploadProgress(40);
      const res = await fetch("/api/agency-admin/documents/upload", { method: "POST", body: fd });
      setUploadProgress(90);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erreur lors de l'upload");
        return;
      }
      setUploadProgress(100);
      onSaved();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }

  const ini = initials(pilgrim.name);
  const selectedTypeMeta = docTypeMeta(form.type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {pilgrim.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pilgrim.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#0f5132]/15 flex items-center justify-center">
                <span className="text-[11px] font-bold text-[#0f5132]">{ini}</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Ajouter un document</h3>
              <p className="text-xs text-gray-400">{pilgrim.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Zone upload */}
          <div
            className={`border-2 border-dashed rounded-xl cursor-pointer transition ${
              file ? "border-[#0f5132]/40 bg-[#0f5132]/[0.02]" : "border-gray-200 hover:border-[#0f5132]/30 hover:bg-gray-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <div className="p-4">
                {preview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Aperçu" className="w-full h-40 object-contain rounded-lg bg-gray-50" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-gray-400 hover:text-red-500 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 bg-[#0f5132]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#0f5132]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} Ko</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-gray-300 hover:text-red-400 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="text-center text-[10px] text-[#0f5132] font-medium mt-1">Cliquer pour changer</p>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700"><span className="text-[#0f5132]">Cliquer</span> ou glisser-déposer</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, PDF — max 10 Mo</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
            />
          </div>

          {/* Type + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Type <span className="text-red-400">*</span></label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DocType }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 cursor-pointer transition"
              >
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocStatus }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 cursor-pointer transition"
              >
                {DOC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Libellé + Expiration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Libellé</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder={selectedTypeMeta.label}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Expiration</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition"
              />
            </div>
          </div>

          {/* Numéro / Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Numéro / Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Ex: N° A1234567"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
            />
          </div>

          {submitting && uploadProgress > 0 && (
            <div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0f5132] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-center">Upload en cours…</p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Annuler
          </button>
          <button
            type="submit"
            form=""
            onClick={(e) => {
              const modal = (e.target as HTMLElement).closest(".bg-white");
              const f = modal?.querySelector("form");
              f?.requestSubmit();
            }}
            disabled={submitting || !file}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0f5132] hover:bg-[#0d4429] rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83" />
                </svg>
                Upload…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Uploader le document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
