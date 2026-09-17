"use client";

import { useState } from "react";
import { X, Plus, Trash2, Wand2 } from "lucide-react";
import { normalizeProgram, standardTemplate, type ProgramHotel } from "@/lib/offer-program";

type Flight = {
  direction?: string;
  airline?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  arrivalTime?: string;
  stopover?: string;
  bagageSoute?: string;
  bagageCabine?: string;
};
type Hotel = {
  name?: string;
  city?: string;
  checkin?: string;
  checkout?: string;
  nights?: string;
  distance?: string;
  pension?: string;
};
type PDay = { day?: string; title?: string; description?: string };
type ProgDoc = { icon?: string; title?: string; content?: string };
type Highlight = { icon?: string; label?: string; value?: string };

const fieldCls =
  "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function ProgramModal({
  offer,
  onClose,
  onSaved,
}: {
  offer: { id: string; type: string; titleFr: string; data: unknown };
  onClose: () => void;
  onSaved: () => void;
}) {
  const init = normalizeProgram(offer.data);
  const withNightsStr = (list: ProgramHotel[]): Hotel[] =>
    list.map((x) => ({ ...x, nights: x.nights == null ? "" : String(x.nights) }));

  const [flights, setFlights] = useState<Flight[]>(init.flights ?? []);
  const [hotels, setHotels] = useState<Hotel[]>(withNightsStr(init.hotels ?? []));
  const [program, setProgram] = useState<PDay[]>(init.program ?? []);
  const [included, setIncluded] = useState<string>((init.included ?? []).join("\n"));
  const [notIncluded, setNotIncluded] = useState<string>((init.notIncluded ?? []).join("\n"));
  const [documents, setDocuments] = useState<ProgDoc[]>(init.documents ?? []);
  const [highlights, setHighlights] = useState<Highlight[]>(init.highlights ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pré-remplit avec le modèle standard (Hajj ou Oumra) : l'agence part d'un
  // contenu complet au lieu d'une page blanche, puis ajuste.
  function applyTemplate() {
    if (!confirm("Remplacer le contenu actuel par le modèle standard ?")) return;
    const tpl = standardTemplate(offer.type);
    setFlights(tpl.flights ?? []);
    setHotels(withNightsStr(tpl.hotels ?? []));
    setProgram(tpl.program ?? []);
    setIncluded((tpl.included ?? []).join("\n"));
    setNotIncluded((tpl.notIncluded ?? []).join("\n"));
    setDocuments(tpl.documents ?? []);
    setHighlights(tpl.highlights ?? []);
  }

  // ── Helpers listes dynamiques ──
  const setF = (i: number, patch: Partial<Flight>) =>
    setFlights((p) => p.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const setH = (i: number, patch: Partial<Hotel>) =>
    setHotels((p) => p.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const setP = (i: number, patch: Partial<PDay>) =>
    setProgram((p) => p.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const setD = (i: number, patch: Partial<ProgDoc>) =>
    setDocuments((p) => p.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const setHi = (i: number, patch: Partial<Highlight>) =>
    setHighlights((p) => p.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const clean = (v: string) => v.trim();

  // Découpe un textarea « une ligne = un élément »
  const toLines = (v: string) =>
    v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

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
            direction: clean(f.direction ?? ""),
            airline: clean(f.airline ?? ""),
            flightNo: clean(f.flightNo ?? ""),
            from: clean(f.from ?? ""),
            to: clean(f.to ?? ""),
            date: clean(f.date ?? ""),
            time: clean(f.time ?? ""),
            arrivalTime: clean(f.arrivalTime ?? ""),
            stopover: clean(f.stopover ?? ""),
            bagageSoute: clean(f.bagageSoute ?? ""),
            bagageCabine: clean(f.bagageCabine ?? ""),
          })),
          hotels: hotels.map((h) => ({
            name: clean(h.name ?? ""),
            city: clean(h.city ?? ""),
            checkin: clean(h.checkin ?? ""),
            checkout: clean(h.checkout ?? ""),
            nights: h.nights ? String(h.nights) : "",
            distance: clean(h.distance ?? ""),
            pension: clean(h.pension ?? ""),
          })),
          program: program.map((d) => ({
            day: clean(d.day ?? ""),
            title: clean(d.title ?? ""),
            description: clean(d.description ?? ""),
          })),
          included: toLines(included),
          notIncluded: toLines(notIncluded),
          documents: documents.map((d) => ({
            icon: clean(d.icon ?? ""),
            title: clean(d.title ?? ""),
            content: clean(d.content ?? ""),
          })),
          highlights: highlights.map((h) => ({
            icon: clean(h.icon ?? ""),
            label: clean(h.label ?? ""),
            value: clean(h.value ?? ""),
          })),
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyTemplate}
              title="Pré-remplir avec le contenu de référence Hajj / Oumra"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-emerald-50 px-3 py-2 rounded-lg transition"
            >
              <Wand2 size={14} /> Modèle standard
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>
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
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus size={13} /> Ajouter un vol
            </button>
          </div>
          <div className="space-y-2">
            {flights.map((f, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
                  <select
                    value={f.direction ?? ""}
                    onChange={(e) => setF(i, { direction: e.target.value })}
                    className={fieldCls}
                  >
                    <option value="">Sens</option>
                    <option value="Aller">Aller</option>
                    <option value="Retour">Retour</option>
                  </select>
                  <input value={f.airline ?? ""} onChange={(e) => setF(i, { airline: e.target.value })} placeholder="Compagnie" className={fieldCls} />
                  <input value={f.flightNo ?? ""} onChange={(e) => setF(i, { flightNo: e.target.value })} placeholder="N° vol" className={fieldCls} />
                  <input value={f.from ?? ""} onChange={(e) => setF(i, { from: e.target.value })} placeholder="De" className={fieldCls} />
                  <input value={f.to ?? ""} onChange={(e) => setF(i, { to: e.target.value })} placeholder="Vers" className={fieldCls} />
                  <div className="flex items-center gap-1">
                    <input value={f.date ?? ""} onChange={(e) => setF(i, { date: e.target.value })} placeholder="Date" className={fieldCls} />
                    <button type="button" onClick={() => setFlights((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <input value={f.time ?? ""} onChange={(e) => setF(i, { time: e.target.value })} placeholder="Heure départ" className={fieldCls} />
                  <input value={f.arrivalTime ?? ""} onChange={(e) => setF(i, { arrivalTime: e.target.value })} placeholder="Heure arrivée" className={fieldCls} />
                  <input value={f.stopover ?? ""} onChange={(e) => setF(i, { stopover: e.target.value })} placeholder="Escale / Direct" className={fieldCls} />
                  <input value={f.bagageSoute ?? ""} onChange={(e) => setF(i, { bagageSoute: e.target.value })} placeholder="Soute (23 kg)" className={fieldCls} />
                  <input value={f.bagageCabine ?? ""} onChange={(e) => setF(i, { bagageCabine: e.target.value })} placeholder="Cabine (7 kg)" className={fieldCls} />
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
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus size={13} /> Ajouter un hôtel
            </button>
          </div>
          <div className="space-y-2">
            {hotels.map((h, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                  <input value={h.name ?? ""} onChange={(e) => setH(i, { name: e.target.value })} placeholder="Nom de l'hôtel" className={fieldCls} />
                  <input value={h.city ?? ""} onChange={(e) => setH(i, { city: e.target.value })} placeholder="Ville" className={fieldCls} />
                  <input value={h.nights ?? ""} onChange={(e) => setH(i, { nights: e.target.value })} placeholder="Nuits" className={fieldCls} />
                  <div className="flex items-center gap-1">
                    <input value={h.distance ?? ""} onChange={(e) => setH(i, { distance: e.target.value })} placeholder="Distance (ex : ~600 m du Haram)" className={fieldCls} />
                    <button type="button" onClick={() => setHotels((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={h.checkin ?? ""} onChange={(e) => setH(i, { checkin: e.target.value })} placeholder="Check-in (JJ/MM/AAAA)" className={fieldCls} />
                  <input value={h.checkout ?? ""} onChange={(e) => setH(i, { checkout: e.target.value })} placeholder="Check-out (JJ/MM/AAAA)" className={fieldCls} />
                  <input value={h.pension ?? ""} onChange={(e) => setH(i, { pension: e.target.value })} placeholder="Pension (ex : non incluse)" className={fieldCls} />
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
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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

        {/* ── Non inclus ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">✕ Non inclus</p>
          </div>
          <textarea
            value={notIncluded}
            onChange={(e) => setNotIncluded(e.target.value)}
            placeholder={"Un élément par ligne, ex :\nRepas (pension non incluse)\nDépenses personnelles\nPourboires"}
            rows={3}
            className={fieldCls}
          />
        </div>

        {/* ── Documents ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📄 Documents à fournir</p>
            <button
              type="button"
              onClick={() => setDocuments((p) => [...p, { icon: "", title: "", content: "" }])}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus size={13} /> Ajouter un document
            </button>
          </div>
          <div className="space-y-2">
            {documents.map((d, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={d.icon ?? ""} onChange={(e) => setD(i, { icon: e.target.value })} placeholder="Icône" className={`${fieldCls} w-20`} />
                  <input value={d.title ?? ""} onChange={(e) => setD(i, { title: e.target.value })} placeholder="Titre (ex : Passeport)" className={fieldCls} />
                  <button type="button" onClick={() => setDocuments((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea
                  value={d.content ?? ""}
                  onChange={(e) => setD(i, { content: e.target.value })}
                  placeholder="Détails / conditions"
                  rows={2}
                  className={fieldCls}
                />
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-xs text-gray-400 italic">Aucun document renseigné</p>
            )}
          </div>
        </div>

        {/* ── Points forts ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">⭐ Points forts</p>
            <button
              type="button"
              onClick={() => setHighlights((p) => [...p, { icon: "", label: "", value: "" }])}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus size={13} /> Ajouter un point fort
            </button>
          </div>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="grid grid-cols-[70px_1fr_1fr_36px] gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/60 p-2">
                <input value={h.icon ?? ""} onChange={(e) => setHi(i, { icon: e.target.value })} placeholder="Icône" className={fieldCls} />
                <input value={h.label ?? ""} onChange={(e) => setHi(i, { label: e.target.value })} placeholder="Libellé (ex : Durée)" className={fieldCls} />
                <input value={h.value ?? ""} onChange={(e) => setHi(i, { value: e.target.value })} placeholder="Valeur (ex : 19 jours)" className={fieldCls} />
                <button type="button" onClick={() => setHighlights((p) => p.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {highlights.length === 0 && (
              <p className="text-xs text-gray-400 italic">Aucun point fort renseigné</p>
            )}
          </div>
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
            className="flex-[2] bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Enregistrement..." : "Enregistrer le programme"}
          </button>
        </div>
      </div>
    </div>
  );
}