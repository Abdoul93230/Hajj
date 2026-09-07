"use client";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PilgrimData = {
  id:             string;
  name:           string;
  phone:          string | null;
  photoUrl:       string | null;
  gender:         string | null;
  birthDate:      string | null;
  city:           string | null;
  country:        string | null;
  address:        string | null;
  profession:     string | null;
  emergencyName:  string | null;
  emergencyPhone: string | null;
  hasPassport:    boolean;
  hasCni:         boolean;
  pilgrimStatus:  string;
  createdAt:      string;
};

type OfferData = {
  titleFr:       string;
  type:          string;
  currency:      string;
  departureDate: string | null;
  returnDate:    string | null;
  category:      string;
};

type AgencyData = {
  name:    string;
  email:   string;
  phone:   string | null;
  address: string | null;
};

interface Props {
  pilgrim:   PilgrimData;
  offer:     OfferData | null;
  agency:    AgencyData;
  logoUrl?:  string;
  qrDataUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FR: Record<string, string> = {
  NOUVEAU:     "Nouveau",
  EN_COURS:    "En cours",
  COMPLET:     "Complet",
  VISA_DEPOSE: "Visa déposé",
  VISA_OK:     "Visa obtenu",
  PARTI:       "En voyage",
  RETOUR:      "Retour",
  CANCELLED:   "Annulé",
  // Compat anciens
  PENDING:     "Nouveau",
  INCOMPLETE:  "En cours",
  REGISTERED:  "Complet",
};

const OFFER_TYPE_FR: Record<string, string> = {
  HAJJ: "Hajj", OMRA: "Oumra", OMRA_RAMADAN: "Oumra Ramadan",
  COMBINED: "Hajj + Oumra", OTHER: "Autre",
};

const CAT_FR: Record<string, string> = {
  ADULT: "Adulte", CHILD: "Enfant", BABY: "Bébé", COUPLE: "Couple",
};

function fmtD(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDLong(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function getAge(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso), t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--;
  return a;
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ pilgrim, offer, agency, logoUrl, qrDataUrl }: Props) {
  const age     = getAge(pilgrim.birthDate);
  const status  = STATUS_FR[pilgrim.pilgrimStatus] ?? pilgrim.pilgrimStatus;
  const shortId = pilgrim.id.slice(-8).toUpperCase();
  const gender  = pilgrim.gender === "M" || pilgrim.gender === "Masculin" ? "Homme"
    : pilgrim.gender === "F" || pilgrim.gender === "Féminin" ? "Femme" : null;

  const Sep = () => (
    <div style={{ borderTop: "1px solid #efefef", margin: "1.5mm 0" }} />
  );

  const SectionTitle = ({ t }: { t: string }) => (
    <div style={{
      fontSize: "1.8mm", fontWeight: 800, color: "#c0c0c0",
      textTransform: "uppercase", letterSpacing: "0.4mm", marginBottom: "1mm",
    }}>{t}</div>
  );

  // Cellule individuelle (label micro au-dessus, valeur en dessous)
  const Cell = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <div style={{ fontSize: "1.8mm", color: "#c0c0c0", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.2mm", marginBottom: "0.3mm" }}>
        {label}
      </div>
      <div style={{ fontSize: "2.6mm", fontWeight: 700, color: value ? "#111" : "#ddd", lineHeight: 1.3 }}>
        {value ?? "—"}
      </div>
    </div>
  );

  // Ligne à 2 colonnes
  const Row2 = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1mm 3mm", marginBottom: "1.5mm" }}>
      {children}
    </div>
  );

  return (
    <div className="badge-card" style={{
      width: "107mm",
      background: "#fff",
      border: "1.5px solid #111",
      borderRadius: "3.5mm",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      boxSizing: "border-box",
      color: "#111",
    }}>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <div style={{
        background: "#111", color: "#fff",
        padding: "2.5mm 3mm",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3mm",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2.5mm", minWidth: 0 }}>
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="logo" style={{ height: "7mm", width: "auto", flexShrink: 0 }} />
            : <div style={{
                width: "7mm", height: "7mm", flexShrink: 0,
                border: "1.5px solid rgba(255,255,255,.4)", borderRadius: "1.5mm",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "3mm", fontWeight: 900,
              }}>
                {agency.name.slice(0, 2).toUpperCase()}
              </div>
          }
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "3.2mm", fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {agency.name}
            </div>
            {agency.address && (
              <div style={{ fontSize: "2mm", opacity: 0.5, marginTop: "0.3mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {agency.address}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {agency.phone && <div style={{ fontSize: "2.3mm", opacity: 0.85 }}>{agency.phone}</div>}
          {agency.email && <div style={{ fontSize: "2mm", opacity: 0.5, marginTop: "0.3mm" }}>{agency.email}</div>}
        </div>
      </div>

      {/* ══ CORPS ══════════════════════════════════════════════════════════════ */}
      <div style={{ padding: "3mm 3mm 2mm", flex: 1 }}>

        {/* ── Photo + identité principale ── */}
        <div style={{ display: "flex", gap: "3mm", alignItems: "flex-start", marginBottom: "2mm" }}>

          {/* Photo */}
          <div style={{
            width: "24mm", height: "30mm", borderRadius: "2mm", flexShrink: 0,
            background: "#f0f0f0", border: "1px solid #ddd", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {pilgrim.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={pilgrim.photoUrl} alt={pilgrim.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "9mm", fontWeight: 900, color: "#ccc" }}>
                  {initials(pilgrim.name)}
                </span>
            }
          </div>

          {/* Identité */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "5mm", fontWeight: 900, lineHeight: 1.1, wordBreak: "break-word" }}>
              {pilgrim.name}
            </div>

            {/* Statut pill */}
            <div style={{
              display: "inline-block", marginTop: "1.5mm", marginBottom: "2mm",
              padding: "0.8mm 3mm", border: "1.5px solid #111", borderRadius: "10mm",
              fontSize: "2.5mm", fontWeight: 800, letterSpacing: "0.2mm",
            }}>
              {status}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 3mm" }}>
              {gender && (
                <span style={{ fontSize: "2.7mm", color: "#555" }}>
                  {gender}{age !== null ? ` · ${age} ans` : ""}
                </span>
              )}
              {pilgrim.birthDate && (
                <span style={{ fontSize: "2.7mm", color: "#555" }}>
                  Né(e) le {fmtD(pilgrim.birthDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Infos personnelles ── */}
        <SectionTitle t="Coordonnées" />
        <Row2>
          <Cell label="Téléphone" value={pilgrim.phone} />
          <Cell label="Ville" value={[pilgrim.city, pilgrim.country].filter(Boolean).join(", ") || null} />
        </Row2>
        <Row2>
          <Cell label="Adresse"    value={pilgrim.address} />
          <Cell label="Profession" value={pilgrim.profession} />
        </Row2>

        {/* ── Voyage ── */}
        {offer && (
          <>
            <Sep />
            <SectionTitle t="Voyage" />
            <div style={{ fontSize: "2.8mm", fontWeight: 900, lineHeight: 1.2, marginBottom: "1mm" }}>
              {offer.titleFr}
            </div>
            <Row2>
              <Cell label="Type"      value={OFFER_TYPE_FR[offer.type] ?? offer.type} />
              <Cell label="Catégorie" value={CAT_FR[offer.category] ?? offer.category} />
            </Row2>
            <Row2>
              <Cell label="Départ" value={fmtDLong(offer.departureDate)} />
              <Cell label="Retour" value={fmtDLong(offer.returnDate)} />
            </Row2>
          </>
        )}

        {/* ── Contact d'urgence ── */}
        {(pilgrim.emergencyName || pilgrim.emergencyPhone) && (
          <>
            <Sep />
            <SectionTitle t="Urgence" />
            <Row2>
              <Cell label="Nom"       value={pilgrim.emergencyName} />
              <Cell label="Téléphone" value={pilgrim.emergencyPhone} />
            </Row2>
          </>
        )}

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <div style={{
        background: "#f9f9f9", borderTop: "1px solid #ebebeb",
        padding: "1.5mm 3mm",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "2mm", color: "#bbb" }}>
            Enregistré le {fmtD(pilgrim.createdAt)}
          </div>
          <div style={{ fontSize: "2.3mm", fontWeight: 800, letterSpacing: "0.3mm", fontFamily: "monospace", color: "#555" }}>
            #{shortId}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR" style={{ width: "14mm", height: "14mm", display: "block" }} />
          <div style={{ fontSize: "1.6mm", color: "#ccc", marginTop: "0.3mm" }}>Dossier</div>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function BadgeView(props: Props) {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #d1d5db; font-family: 'Helvetica Neue', Arial, sans-serif; }

        /* Écran : 2 cartes côte à côte (comme à l'impression) */
        .screen-wrap {
          min-height: 100vh;
          padding: 72px 20px 48px;
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { background: #fff !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .screen-wrap {
            min-height: 0 !important;
            padding: 0 !important;
            background: none !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: center !important;
            align-items: flex-start !important;
            gap: 0 !important;
          }
          .badge-card {
            margin: 4mm !important;
            page-break-inside: avoid !important;
          }
          @page { size: A4 landscape; margin: 4mm; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => window.history.back()} style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #d1d5db",
            background: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Badge · {props.pilgrim.name}
          </span>
        </div>
        <button onClick={() => window.print()} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#111", color: "#fff", border: "none",
          padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer · 2 par feuille
        </button>
      </div>

      {/* ── 2 cartes côte à côte ── */}
      <div className="screen-wrap">
        <Badge {...props} />
        <Badge {...props} />
      </div>
    </>
  );
}
