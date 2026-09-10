"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

type Flight = { airline: string; flightNo?: string; from?: string; to?: string; date?: string; time?: string };
type Hotel   = { name?: string; city?: string; nights?: string };
type PDay    = { day?: string; title?: string; description?: string };
type ProgramData = {
  maxCapacity?: number;
  flights?: Flight[];
  hotels?: Hotel[];
  program?: PDay[];
  included?: string[];
};

const fieldCls =
  "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function ProgramModal({
  offer,
  onClose,
  onSaved,
}: {
  offer: { id: string; titleFr: string; data: unknown };
  onClose: () => void;
  onSaved: () => void;
}) {
  const init = (offer.data ?? {}) as ProgramData;
  const [flights, setFlights] = useState<Flight[]>(init.flights ?? []);
  const [hotels, setHotels] = useState<Hotel[]>(init.hotels ?? []);
  const [program, setProgram] = useState<PDay[]>(init.program ?? []);
  const [included, setIncluded] = useState<string>((init.included ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Helpers listes dynamiques ──
  const setF = (i: number, patch: Partial<Flight>) =>
    setFlights((p) => p.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const setH = (i: number, patch: Partial<Hotel>) =>
    setHotels((p) => p.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const setP = (i: number, patch: Partial<PDay>) =>
    setProgram((p) => p.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const clean = (v: string) => v.trim();

  async function save(e: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/agency-admin/voyages/${offer.id}/program`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flights: flights.map((f) => ({
            airline: clean(f.airline ?? ""),
            flightNo: clean(f.flightNo ?? ""),
            from: clean(f.from ?? ""),
            to: clean(f.to ?? ""),
            date: clean(f.date ?? ""),
            time: clean(f.time ?? ""),
          })),
          hotels: hotels.map((h) => ({
            name: clean(h.name ?? ""),
            city: clean(h.city ?? ""),
            nights: h.nights ? String(h.nights) : "",
          })),
          program: program.map((d) => ({
            day: clean(d.day ?? ""),
            title: clean(d.title ?? ""),
            description: clean(d.description ?? ""),
          })),
          included: included
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la sauvegarde");
      } else {
        onSaved();
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Programme du voyage</h2>
            <p className="text-sm text-gray-500">{offer.titleFr}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        {/* ── Vols ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">✈ Vols</p>
            <button
              type="button"
              onClick={() => setFlights((p) => [...p, { airline: "" }])}
              className="flex items-center gap-1 text-xs font-semibold text-[#0f5132] hover:underline"
            >
              <Plus size={13} /> Ajouter un vol
            </button>
          </div>
          <div className="space-y-2">
            {flights.map((f, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/60 p-2">
                <input value={f.airline ?? ""} onChange={(e) => setF(i, { airline: e.target.value })} placeholder="Compagnie" className={fieldCls} />
                <input value={f.flightNo ?? ""} onChange={(e) => setF(i, { flightNo: e.target.value })} placeholder="N° vol" className={fieldCls} />
                <input value={f.from ?? ""} onChange={(e) => setF(i, { from: e.target.value })} placeholder="De" className={fieldCls} />
                <input value={f.to ?? ""} onChange={(e) => setF(i, { to: e.target.value })} placeholder="Vers" className={fieldCls} />
                <input value={f.date ?? ""} onChange={(e) => setF(i, { date: e.target.value })} placeholder="Date (JJ/MM)" className={fieldCls} />
                <div className="flex items-center gap-1">
                  <input value={f.time ?? ""} onChange={(e) => setF(i, { time: e.target.value })} placeholder="Heure" className={fieldCls} />
                  <button type="button" onClick={() => setFlights((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {flights.length === 0 && (
              <p className="text-xs text-gray-400 italic">Aucun vol renseigné</p>
            )}
          </div>
        </div>

        {/* ── Hôtels ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🏨 Hôtels</p>
            <button
              type="button"
              onClick={() => setHotels((p) => [...p, { name: "" }])}
              className="flex items-center gap-1 text-xs font-semibold text-[#0f5132] hover:underline"
            >
              <Plus size={13} /> Ajouter un hôtel
            </button>
          </div>
          <div className="space-y-2">
            {hotels.map((h, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/60 p-2">
                <input value={h.name ?? ""} onChange={(e) => setH(i, { name: e.target.value })} placeholder="Nom de l'hôtel" className={fieldCls} />
                <input value={h.city ?? ""} onChange={(e) => setH(i, { city: e.target.value })} placeholder="Ville" className={fieldCls} />
                <input value={h.nights ?? ""} onChange={(e) => setH(i, { nights: e.target.value })} placeholder="Nuits" className={fieldCls} />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setHotels((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg ml-auto">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {hotels.length === 0 && (
              <p className="text-xs text-gray-400 italic">Aucun hôtel renseigné</p>
            )}
          </div>
        </div>

        {/* ── Programme jour par jour ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🗓️ Programme jour par jour</p>
            <button
              type="button"
              onClick={() => setProgram((p) => [...p, { day: String(p.length + 1), title: "" }])}
              className="flex items-center gap-1 text-xs font-semibold text-[#0f5132] hover:underline"
            >
              <Plus size={13} /> Ajouter un jour
            </button>
          </div>
          <div className="space-y-2">
            {program.map((d, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <input value={d.day ?? ""} onChange={(e) => setP(i, { day: e.target.value })} placeholder="Jour (n°)" className={fieldCls} />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setProgram((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg ml-auto">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <input value={d.title ?? ""} onChange={(e) => setP(i, { title: e.target.value })} placeholder="Titre du jour" className={fieldCls} />
                <textarea
                  value={d.description ?? ""}
                  onChange={(e) => setP(i, { description: e.target.value })}
                  placeholder="Description (visites, activités...)"
                  rows={2}
                  className={fieldCls}
                />
              </div>
            ))}
            {program.length === 0 && (
              <p className="text-xs text-gray-400 italic">Aucun jour renseigné</p>
            )}
          </div>
        </div>

        {/* ── Inclus ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">✓ Ce qui est inclus</p>
          </div>
          <textarea
            value={included}
            onChange={(e) => setIncluded(e.target.value)}
            placeholder={"Un élément par ligne, ex :\nVols aller-retour\nHôtel à La Mecque\nTransport sur place"}
            rows={4}
            className={fieldCls}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-[2] bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0d4429] transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Enregistrement..." : "Enregistrer le programme"}
          </button>
        </div>
      </div>
    </div>
  );
}