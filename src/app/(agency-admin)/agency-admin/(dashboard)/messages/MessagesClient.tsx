"use client";

import { useMemo, useState } from "react";
import PhoneInput from "@/components/ui/PhoneInput";
import {
  MAX_BULK_RECIPIENTS,
  SMS_SOURCE_LABELS,
  SMS_STATUS_LABELS,
  SMS_TEMPLATES,
  SMS_VARIABLES,
  countSmsSegments,
  type SmsSource,
  type SmsStatus,
} from "@/lib/sms-segments";
import { formatPhoneDisplay, resolveChannel } from "@/lib/phone";

type Pilgrim = { id: string; name: string; phone: string | null; email: string | null };
type Voyage = { id: string; title: string; departureDate: string | null; pilgrimIds: string[] };
type Message = {
  id: string;
  to: string;
  toNormalized: string;
  recipientName: string | null;
  channel: string;
  body: string;
  segments: number;
  source: string;
  status: string;
  error: string | null;
  sentByName: string | null;
  createdAt: string;
};

type Props = {
  pilgrims: Pilgrim[];
  voyages: Voyage[];
  initialMessages: Message[];
  counters: {
    month: number;
    monthFailed: number;
    monthSkipped: number;
    total: number;
    lastSentAt: string | null;
  };
  sender: string;
  configured: boolean;
  initialPilgrimId?: string;
  selectedYear: number;
};

type Audience = "ALL" | "VOYAGE" | "IDS";

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  SKIPPED: "bg-amber-50 text-amber-700 border-amber-200",
};

function Stat({ label, value, tone }: { label: string; value: number; tone?: "error" | "warn" }) {
  const color =
    tone === "error" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export default function MessagesClient({
  pilgrims,
  voyages,
  initialMessages,
  counters,
  sender,
  configured,
  initialPilgrimId,
  selectedYear,
}: Props) {
  const [tab, setTab] = useState<"send" | "history">("send");
  const [audience, setAudience] = useState<Audience>(initialPilgrimId ? "IDS" : "ALL");
  const [voyageId, setVoyageId] = useState("");
  const [selected, setSelected] = useState<string[]>(initialPilgrimId ? [initialPilgrimId] : []);
  const [search, setSearch] = useState("");
  const [freePhone, setFreePhone] = useState("");
  const [freeName, setFreeName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const isFreePhone = freePhone.trim().length > 0;

  // Destinataires résolus selon le mode choisi
  const recipients = useMemo(() => {
    if (isFreePhone) {
      return [{ id: "free", name: freeName || "Numéro libre", phone: freePhone, email: null }];
    }
    if (audience === "VOYAGE") {
      const voyage = voyages.find((v) => v.id === voyageId);
      if (!voyage) return [];
      const ids = new Set(voyage.pilgrimIds);
      return pilgrims.filter((p) => ids.has(p.id));
    }
    if (audience === "IDS") return pilgrims.filter((p) => selected.includes(p.id));
    return pilgrims;
  }, [isFreePhone, audience, voyageId, voyages, pilgrims, selected, freePhone, freeName]);

  // Canaux effectivement utilisables : SMS (Niger) sinon email, sinon rien
  const channelCounts = useMemo(() => {
    let sms = 0;
    let email = 0;
    let none = 0;
    for (const recipient of recipients) {
      const channel = resolveChannel(recipient.phone, recipient.email);
      if (channel === "SMS") sms += 1;
      else if (channel === "EMAIL") email += 1;
      else none += 1;
    }
    return { sms, email, none };
  }, [recipients]);

  const reachableCount = channelCounts.sms + channelCounts.email;
  const segments = countSmsSegments(body);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pilgrims;
    return pilgrims.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.phone ?? "").includes(query) ||
        (p.email ?? "").toLowerCase().includes(query)
    );
  }, [pilgrims, search]);

  function togglePilgrim(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function refresh() {
    const res = await fetch("/api/agency-admin/messages?range=all");
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function send() {
    if (!body.trim()) {
      setFeedback({ tone: "error", text: "Saisissez le message à envoyer." });
      return;
    }
    if (!recipients.length) {
      setFeedback({ tone: "error", text: "Sélectionnez au moins un destinataire." });
      return;
    }
    if (recipients.length > MAX_BULK_RECIPIENTS) {
      setFeedback({
        tone: "error",
        text: `Maximum ${MAX_BULK_RECIPIENTS} destinataires par envoi (${recipients.length} sélectionnés).`,
      });
      return;
    }

    const credits = channelCounts.sms * segments;
    const label = [
      channelCounts.sms ? `${channelCounts.sms} SMS (Niger)` : null,
      channelCounts.email ? `${channelCounts.email} email(s)` : null,
      channelCounts.none ? `${channelCounts.none} sans canal` : null,
    ]
      .filter(Boolean)
      .join(" + ");
    const cost = credits > 0 ? ` — ${credits} crédit(s) SMS` : "";
    if (!window.confirm(`Envoyer à ${recipients.length} destinataires — ${label}${cost} ?`)) {
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agency-admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          year: selectedYear,
          ...(isFreePhone
            ? { phone: freePhone.trim(), name: freeName.trim() }
            : { audience, voyageId: voyageId || null, ids: selected }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error ?? "Envoi impossible." });
        return;
      }
      setFeedback({
        tone: data.failed > 0 ? "error" : "ok",
        text:
          [
            data.sentSms ? `${data.sentSms} SMS envoyé(s) vers le Niger` : null,
            data.sentEmail ? `${data.sentEmail} email(s) envoyé(s)` : null,
            data.skipped ? `· ${data.skipped} sans canal` : "",
            data.failed ? `· ${data.failed} échec(s)` : "",
            data.warning ? `· ${data.warning}` : "",
          ]
            .filter((part): part is string => Boolean(part))
            .join(" ") || "Aucun envoi — aucun destinataire joignable.",
      });
      await refresh();
    } catch {
      setFeedback({ tone: "error", text: "Erreur réseau." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Messages SMS</h1>
        <p className="mt-1 text-sm text-gray-600">
          Envoi individuel ou groupé aux pèlerins · expéditeur <strong>{sender}</strong>
        </p>
      </header>

      {!configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          L&apos;envoi de SMS n&apos;est pas configuré : les messages seront enregistrés mais non
          expédiés.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="SMS ce mois" value={counters.month} />
        <Stat label="Total envoyés" value={counters.total} />
        <Stat label="Échecs (mois)" value={counters.monthFailed} tone="error" />
        <Stat label="Sans numéro (mois)" value={counters.monthSkipped} tone="warn" />
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "send" as const, label: "Envoyer" },
          { key: "history" as const, label: "Historique" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === item.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {tab === "send" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <RecipientPicker
            pilgrims={pilgrims}
            voyages={voyages}
            audience={audience}
            setAudience={setAudience}
            voyageId={voyageId}
            setVoyageId={setVoyageId}
            selected={selected}
            setSelected={setSelected}
            togglePilgrim={togglePilgrim}
            filtered={filtered}
            search={search}
            setSearch={setSearch}
            freeName={freeName}
            setFreeName={setFreeName}
            freePhone={freePhone}
            setFreePhone={setFreePhone}
            isFreePhone={isFreePhone}
            reachableCount={reachableCount}
            smsCount={channelCounts.sms}
            emailCount={channelCounts.email}
            noneCount={channelCounts.none}
          />

          <MessageComposer
            body={body}
            setBody={setBody}
            segments={segments}
            recipientCount={reachableCount}
            smsCount={channelCounts.sms}
            emailCount={channelCounts.email}
            busy={busy}
            onSend={send}
          />
        </div>
      ) : (
        <HistoryTable messages={messages} />
      )}
    </div>
  );
}

// ── Sous-composant : choix des destinataires ─────────────────────────────────

function RecipientPicker({
  pilgrims,
  voyages,
  audience,
  setAudience,
  voyageId,
  setVoyageId,
  selected,
  setSelected,
  togglePilgrim,
  filtered,
  search,
  setSearch,
  freeName,
  setFreeName,
  freePhone,
  setFreePhone,
  isFreePhone,
  reachableCount,
  smsCount,
  emailCount,
  noneCount,
}: {
  pilgrims: Pilgrim[];
  voyages: Voyage[];
  audience: Audience;
  setAudience: (value: Audience) => void;
  voyageId: string;
  setVoyageId: (value: string) => void;
  selected: string[];
  setSelected: (value: string[]) => void;
  togglePilgrim: (id: string) => void;
  filtered: Pilgrim[];
  search: string;
  setSearch: (value: string) => void;
  freeName: string;
  setFreeName: (value: string) => void;
  freePhone: string;
  setFreePhone: (value: string) => void;
  isFreePhone: boolean;
  reachableCount: number;
  smsCount: number;
  emailCount: number;
  noneCount: number;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">Destinataires</h2>

      <div className="mt-3 space-y-2">
        {[
          { key: "ALL" as const, label: `Tous les pèlerins (${pilgrims.length})` },
          { key: "VOYAGE" as const, label: "Par voyage" },
          { key: "IDS" as const, label: `Sélection par cochage (${selected.length})` },
        ].map((option) => (
          <label key={option.key} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="audience"
              checked={audience === option.key && !isFreePhone}
              onChange={() => {
                setAudience(option.key);
                setFreePhone("");
              }}
            />
            {option.label}
          </label>
        ))}
      </div>

      {audience === "VOYAGE" && !isFreePhone && (
        <select
          value={voyageId}
          onChange={(event) => setVoyageId(event.target.value)}
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Choisir un voyage…</option>
          {voyages.map((voyage) => (
            <option key={voyage.id} value={voyage.id}>
              {voyage.title} ({voyage.pilgrimIds.length} pèlerins)
            </option>
          ))}
        </select>
      )}

      {audience === "IDS" && !isFreePhone && (
        <div className="mt-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un pèlerin…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{selected.length} sélectionné(s)</span>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-emerald-700 hover:underline"
                onClick={() => setSelected(filtered.map((p) => p.id))}
              >
                Tout cocher
              </button>
              <button
                type="button"
                className="text-gray-600 hover:underline"
                onClick={() => setSelected([])}
              >
                Tout décocher
              </button>
            </div>
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
            {filtered.map((pilgrim) => (
              <label
                key={pilgrim.id}
                className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(pilgrim.id)}
                  onChange={() => togglePilgrim(pilgrim.id)}
                />
                <span className="flex-1 text-gray-800">{pilgrim.name}</span>
                <ChannelBadge phone={pilgrim.phone} email={pilgrim.email} />
              </label>
            ))}
            {!filtered.length && (
              <p className="px-3 py-4 text-center text-sm text-gray-500">Aucun pèlerin.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ou numéro libre</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={freeName}
            onChange={(event) => setFreeName(event.target.value)}
            placeholder="Nom (facultatif)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <PhoneInput value={freePhone} onChange={setFreePhone} />
        </div>
      </div>

      <div className="mt-4 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <p>
          <strong className="text-emerald-700">{smsCount}</strong> par SMS
          <span className="text-xs text-gray-500"> (Niger)</span> ·{" "}
          <strong className="text-sky-700">{emailCount}</strong> par email
          {noneCount > 0 && <> · <strong className="text-amber-600">{noneCount}</strong> sans canal</>}
        </p>
        <p className="text-xs text-gray-500">
          {reachableCount} destinataire(s) joignable(s) sur {smsCount + emailCount + noneCount}.
          Les numéros hors Niger reçoivent le message par email.
        </p>
      </div>
    </section>
  );
}

// ── Sous-composant : rédaction du message ────────────────────────────────────

function MessageComposer({
  body,
  setBody,
  segments,
  recipientCount,
  smsCount,
  emailCount,
  busy,
  onSend,
}: {
  body: string;
  setBody: (value: string) => void;
  segments: number;
  recipientCount: number;
  smsCount: number;
  emailCount: number;
  busy: boolean;
  onSend: () => void;
}) {
  const addVariable = (key: string) => setBody(`${body}{{${key}}}`);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">Message</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value=""
          onChange={(event) => {
            const template = SMS_TEMPLATES.find((item) => item.key === event.target.value);
            if (template) setBody(template.body);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Modèle…</option>
          {SMS_TEMPLATES.map((template) => (
            <option key={template.key} value={template.key}>
              {template.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={6}
        placeholder="Votre message…"
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          {body.length} caractère(s) · <strong>{segments}</strong> SMS par destinataire
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {smsCount > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              {segments * smsCount} SMS
            </span>
          )}
          {emailCount > 0 && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
              {emailCount} email(s)
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SMS_VARIABLES.map((variable) => (
          <button
            key={variable.key}
            type="button"
            onClick={() => addVariable(variable.key)}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {`{{${variable.key}}}`}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={busy || !body.trim() || recipientCount === 0}
        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Envoi en cours…" : `Envoyer à ${recipientCount} destinataire(s)`}
      </button>
    </section>
  );
}

// ── Sous-composant : historique ──────────────────────────────────────────────

function HistoryTable({ messages }: { messages: Message[] }) {
  if (!messages.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Aucun message envoyé pour le moment.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Destinataire</th>
            <th className="px-4 py-3">Canal</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => (
            <tr key={message.id} className="border-t border-gray-100">
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {new Date(message.createdAt).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-3">
                <div className="text-gray-900">{message.recipientName ?? "-"}</div>
                <div className="text-xs text-gray-500">
                  {formatPhoneDisplay(message.toNormalized) || message.to || "-"}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <ChannelTag channel={message.channel} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {SMS_SOURCE_LABELS[message.source as SmsSource] ?? message.source}
              </td>
              <td className="max-w-md px-4 py-3 text-gray-700">
                <span className="line-clamp-2">{message.body}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={message.status} error={message.error} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  const tone = STATUS_STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-medium ${tone}`}
      title={error ?? ""}
    >
      {SMS_STATUS_LABELS[status as SmsStatus] ?? status}
    </span>
  );
}

// ── Sous-composant : canal réellement utilisé pour un contact ────────────────
// Règle métier : SMS uniquement vers le Niger (+227), sinon email, sinon rien.

const CHANNEL_STYLES: Record<string, string> = {
  SMS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EMAIL: "bg-sky-50 text-sky-700 border-sky-200",
  NONE: "bg-gray-100 text-gray-500 border-gray-200",
};

const CHANNEL_ICONS: Record<string, string> = { SMS: "💬", EMAIL: "✉️", NONE: "—" };

function ChannelTag({ channel }: { channel?: string | null }) {
  const key = (channel ?? "SMS").toUpperCase();
  const tone = CHANNEL_STYLES[key] ?? CHANNEL_STYLES.NONE;
  const labels: Record<string, string> = { SMS: "SMS", EMAIL: "Email", NONE: "Aucun" };

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>
      {CHANNEL_ICONS[key] ?? "—"} {labels[key] ?? key}
    </span>
  );
}

/** Affiche le canal utilisable + le numéro lisible (ou l'email). */
function ChannelBadge({ phone, email }: { phone: string | null; email: string | null }) {
  const channel = resolveChannel(phone, email);

  if (channel === "SMS") {
    return (
      <span className="whitespace-nowrap text-xs text-emerald-700" title="SMS (Niger)">
         {formatPhoneDisplay(phone)}
      </span>
    );
  }

  if (channel === "EMAIL") {
    return (
      <span
        className="max-w-[14rem] truncate whitespace-nowrap text-xs text-sky-700"
        title={`Email : ${email}${phone ? ` · ${formatPhoneDisplay(phone)} (pas de SMS hors Niger)` : ""}`}
      >
        ✉️ {email}
      </span>
    );
  }

  return <span className="whitespace-nowrap text-xs text-amber-600">— aucun contact</span>;
}
