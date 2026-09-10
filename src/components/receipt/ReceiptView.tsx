"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentData = {
  id: string;
  amount: number;
  type: string;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  reservation: {
    totalAmount: number | null;
    offer: {
      titleFr: string;
      currency: string;
      priceAdult: number;
      departureDate: string | null;
    };
  };
  pilgrim: {
    name: string;
    phone: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

type TenantData = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
};

interface Props {
  payment:     PaymentData;
  tenant:      TenantData;
  totalAmount: number;
  paidBefore:  number;
  totalPaid:   number;
  remaining:   number;
  copies?:     1 | 2; // 2 par défaut (agence) · 1 pour le pèlerin
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Acompte", INSTALLMENT: "Versement", FINAL: "Solde final", REFUND: "Remboursement",
};
const METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces", BANK_TRANSFER: "Virement bancaire",
  MOBILE_MONEY: "Mobile Money", CHECK: "Chèque", OTHER: "Autre",
};

function fmt(n: number, cur: string) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + cur;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function recNum(id: string, ref: string | null) {
  return ref ?? "N°" + id.slice(-8).toUpperCase();
}

// ─── Single receipt block ─────────────────────────────────────────────────────

function Receipt({ payment, tenant, totalAmount, paidBefore, totalPaid, remaining }: Props) {
  const isRefund      = payment.type === "REFUND";
  const currency      = payment.reservation.offer.currency;
  const num           = recNum(payment.id, payment.reference);
  const pilgrim       = payment.pilgrim;
  const offer         = payment.reservation.offer;
  const isSolde       = remaining === 0 && totalPaid > 0;
  const remainBefore  = Math.max(0, totalAmount - paidBefore);

  // Logo from theme JSON if present
  const logoUrl  = (tenant.theme as Record<string, unknown> | null)?.logoUrl as string | undefined;

  const HR = () => (
    <div style={{ borderTop: "1px solid #000", margin: "8px 0" }} />
  );

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "2px 0", fontSize: 11 }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, textAlign: "right" }}>{value}</span>
    </div>
  );

  return (
    <div className="receipt-block" style={{
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: "#000",
      background: "#fff",
      padding: "18px 22px",
      width: "100%",
      boxSizing: "border-box",
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        {/* Logo / Agence */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo" style={{ height: 36, width: "auto", objectFit: "contain" }} />
          ) : (
            <div style={{
              width: 36, height: 36, border: "2px solid #000", borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900, letterSpacing: -0.5,
            }}>
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, lineHeight: 1.2 }}>
              {tenant.name}
            </div>
            <div style={{ fontSize: 9, color: "#555", lineHeight: 1.5 }}>
              {[tenant.phone, tenant.email].filter(Boolean).join("  ·  ")}
            </div>
          </div>
        </div>

        {/* Ref + date */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{num}</div>
          <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{fmtDateLong(payment.paidAt)}</div>
        </div>
      </div>

      <HR />

      {/* ── Title ── */}
      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.3, textTransform: "uppercase", margin: "6px 0 2px" }}>
        {isRefund ? "Avis de Remboursement" : "Reçu de Paiement"}
      </div>

      <HR />

      {/* ── Pilgrim + voyage ── */}
      <div style={{ margin: "6px 0", fontSize: 11 }}>
        <Row label="Pèlerin"    value={pilgrim?.name ?? "—"} bold />
        {pilgrim?.phone && <Row label="Téléphone" value={pilgrim.phone} />}
        {(pilgrim?.city || pilgrim?.country) &&
          <Row label="Localité" value={[pilgrim.city, pilgrim.country].filter(Boolean).join(", ")} />}
        <Row label="Voyage" value={offer.titleFr} bold />
        {offer.departureDate && <Row label="Départ" value={fmtDate(offer.departureDate)} />}
      </div>

      <HR />

      {/* ── Règlement ── */}
      <div style={{ margin: "6px 0" }}>
        {/* Montant en gros */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 0 5px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {isRefund ? "Montant remboursé" : "Montant versé"}
          </span>
          <span className="amount-big" style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
            {isRefund ? "−" : ""}{fmt(payment.amount, currency)}
          </span>
        </div>
        <Row label="Type"             value={TYPE_LABEL[payment.type] ?? payment.type} />
        <Row label="Mode de paiement" value={METHOD_LABEL[payment.method] ?? payment.method} />
        {payment.reference && <Row label="Référence" value={payment.reference} bold />}
      </div>

      <HR />

      {/* ── Solde avant / après — mini-table compacte ── */}
      <div style={{ margin: "4px 0" }}>
        <Row label="Forfait total" value={fmt(totalAmount, currency)} />

        {/* Tableau avant → versement → après */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 5, fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left",  fontWeight: 600, color: "#777", paddingBottom: 2, width: "30%" }}></th>
              <th style={{ textAlign: "right", fontWeight: 600, color: "#777", paddingBottom: 2 }}>Avant</th>
              <th style={{ textAlign: "center",fontWeight: 700, color: "#000", paddingBottom: 2, width: "30%" }}>
                {isRefund ? "− Rembt" : "+ Versmt"}
              </th>
              <th style={{ textAlign: "right", fontWeight: 600, color: "#777", paddingBottom: 2 }}>Après</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: "1px solid #000" }}>
              <td style={{ padding: "3px 0", fontWeight: 600, fontSize: 10 }}>Versé</td>
              <td style={{ textAlign: "right", color: "#555", padding: "3px 0" }}>{fmt(Math.max(0, paidBefore), currency)}</td>
              <td style={{ textAlign: "center", fontWeight: 900, padding: "3px 4px", borderLeft: "1px solid #ccc", borderRight: "1px solid #ccc" }}>
                {isRefund ? "−" : "+"}{fmt(payment.amount, currency)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "3px 0" }}>{fmt(Math.max(0, totalPaid), currency)}</td>
            </tr>
            <tr style={{ borderTop: "1px dashed #ccc" }}>
              <td style={{ padding: "3px 0", fontWeight: 600, fontSize: 10 }}>Reste</td>
              <td style={{ textAlign: "right", color: "#555", padding: "3px 0" }}>{fmt(remainBefore, currency)}</td>
              <td style={{ borderLeft: "1px solid #ccc", borderRight: "1px solid #ccc" }}></td>
              <td style={{ textAlign: "right", fontWeight: 900, padding: "3px 0" }}>
                {isSolde ? <span style={{ fontWeight: 700 }}>Soldé ✓</span> : fmt(remaining, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {payment.notes && (
        <>
          <HR />
          <div style={{ fontSize: 9, color: "#555", margin: "4px 0" }}>
            <em>Note : {payment.notes}</em>
          </div>
        </>
      )}

      <HR />

      {/* ── Signatures ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 7 }}>
        {["Signature & cachet agence", "Signature du pèlerin"].map((lbl) => (
          <div key={lbl}>
            <div style={{ height: 20, borderBottom: "1px solid #000", marginBottom: 3 }} />
            <div style={{ fontSize: 9, color: "#555" }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Micro-footer */}
      <div style={{ fontSize: 8, color: "#aaa", textAlign: "center", marginTop: 10 }}>
        Reçu valable — {tenant.name} · {new Date(payment.paidAt).getFullYear()}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ReceiptView(props: Props) {
  // props contient paidBefore, transmis à Receipt via spread
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #e5e7eb; font-family: 'Helvetica Neue', Arial, sans-serif; }

        .screen-wrap {
          min-height: 100vh;
          padding: 70px 16px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .receipt-paper {
          background: #fff;
          box-shadow: 0 4px 24px rgba(0,0,0,.13);
          width: 100%;
          max-width: 500px;
          border: 1px solid #d1d5db;
        }

        .cut-line {
          width: 100%;
          max-width: 500px;
          border: none;
          border-top: 2px dashed #9ca3af;
          margin: 12px 0;
        }

        .print-copy { display: none; }

        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body  { background: #fff !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }

          /* Reset du wrapper — surtout min-height qui forçait 2 pages */
          .screen-wrap {
            min-height: 0 !important;
            padding: 0 !important;
            background: none !important;
            display: block !important;
          }

          .receipt-paper {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            border-bottom: 1px solid #ccc !important;
          }

          /* Ligne de coupe (2 exemplaires agence uniquement) */
          ${props.copies === 2 ? `
          .cut-line {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            border-top: 1px dashed #000 !important;
            margin: 4mm 0 !important;
          }

          /* 2e exemplaire visible à l'impression */
          .print-copy { display: block !important; }

          /* Empêcher toute coupure de page à l'intérieur d'un reçu */
          .receipt-block { page-break-inside: avoid; }

          /* Réduire fortement padding et police pour tenir 2 reçus sur une A4 */
          .receipt-block { padding: 7px 14px !important; }
          .receipt-block * { font-size: 9pt !important; line-height: 1.3 !important; }
          .receipt-block .amount-big { font-size: 13pt !important; }
          .receipt-block table * { font-size: 8.5pt !important; }
          ` : `
          /* Exemplaire unique (pèlerin) : garder un rendu pleine page confortable */
          .receipt-paper { /* pleine largeur dans @page margin 8mm */ }
          .receipt-block { page-break-inside: avoid; }
          `}

          @page { size: A4 portrait; margin: ${props.copies === 2 ? "8mm 12mm" : "10mm 14mm"}; }
        }
      `}</style>

      {/* ── Top bar (screen only) ── */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => window.history.back()} style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #d1d5db",
            background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Reçu · {props.payment.reference ?? props.payment.id.slice(-8).toUpperCase()}
          </span>
        </div>
        <button onClick={() => window.print()} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#111", color: "#fff", border: "none",
          padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}>
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer / PDF
        </button>
      </div>

      {/* ── Receipt (screen) ── */}
      <div className="screen-wrap">
        <div className="receipt-paper">
          <Receipt {...props} />
        </div>

        {/* Cut line + 2nd copy (print only) — uniquement pour l'agence (2 exemplaires) */}
        {props.copies !== 1 && (
          <>
            <hr className="cut-line" />
            <div className="print-copy receipt-paper" style={{ width: "100%" }}>
              <Receipt {...props} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
