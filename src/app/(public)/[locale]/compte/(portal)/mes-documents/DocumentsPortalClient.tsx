"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, Trash2, ExternalLink, Pencil, X } from "lucide-react";

export type PortalDoc = {
  id: string;
  type: string;
  status: string;
  label: string | null;
  fileUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  notes: string | null;
};

const TYPES = ["PASSPORT", "CNI", "VISA", "PHOTO", "OTHER"];

const STATUS_BADGE: Record<string, string> = {
  RECEIVED: "bg-amber-100 text-amber-700",
  VALID: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  REJECTED: "bg-red-100 text-red-600",
};

const TYPE_COLOR: Record<string, string> = {
  PASSPORT: "bg-blue-100 text-blue-700",
  CNI: "bg-violet-100 text-violet-700",
  VISA: "bg-amber-100 text-amber-700",
  PHOTO: "bg-pink-100 text-pink-700",
  OTHER: "bg-gray-100 text-gray-600",
};

// Alerte si le document expire dans moins de 6 mois
function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  const limit = new Date();
  limit.setMonth(limit.getMonth() + 6);
  return d <= limit;
}

export default function DocumentsPortalClient({ docs }: { docs: PortalDoc[] }) {
  const t = useTranslations("portal.docs");
  const router = useRouter();

  const [type, setType] = useState("PASSPORT");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Modal d'édition ──
  const [editing, setEditing] = useState<PortalDoc | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Types pas encore déposés (sauf rejetés) — n'apparaissent plus dans la liste
  const availableTypes = TYPES.filter(
    (tp) => !docs.some((d) => d.type === tp && d.status !== "REJECTED")
  );

  useEffect(() => {
    if (availableTypes.length && !availableTypes.includes(type)) {
      setType(availableTypes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTypes.join(",")]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      if (label) fd.append("label", label);
      if (expiresAt) fd.append("expiresAt", expiresAt);

      const res = await fetch("/api/pilgrim/documents/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? t("errorGeneric") });
      } else {
        setMsg({ ok: true, text: t("success") });
        setFile(null);
        setLabel("");
        setExpiresAt("");
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: t("errorGeneric") });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/pilgrim/documents/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? t("errorGeneric") });
      } else {
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: t("errorGeneric") });
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(doc: PortalDoc) {
    setEditing(doc);
    setEditLabel(doc.label ?? "");
    setEditExpiresAt(doc.expiresAt ? doc.expiresAt.slice(0, 10) : "");
    setEditFile(null);
    setMsg(null);
  }

  function closeEdit() {
    setEditing(null);
    setEditFile(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      if (editLabel.trim()) fd.append("label", editLabel.trim());
      else fd.append("label", "");
      if (editExpiresAt) fd.append("expiresAt", editExpiresAt);
      else fd.append("expiresAt", "");
      if (editFile) fd.append("file", editFile);

      const res = await fetch(`/api/pilgrim/documents/${editing.id}`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? t("errorGeneric") });
      } else {
        setMsg({ ok: true, text: t("saved") });
        closeEdit();
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: t("errorGeneric") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Upload ── */}
      <form
        onSubmit={handleUpload}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
      >
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Upload size={13} /> {t("upload")}
        </p>

        {msg && (
          <div
            className={`text-sm rounded-lg px-4 py-2.5 ${
              msg.ok
                ? "bg-green-50 border border-green-100 text-green-700"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableTypes.map((tp) => (
                <option key={tp} value={tp}>
                  {t(tp)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("expiresAt")}</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t("label")}</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t("file")}</label>
          <input
            type="file"
            required
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0f5132]/10 file:text-[#0f5132] file:font-semibold file:cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0d4429] transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          <Upload size={15} />
          {uploading ? t("uploading") : t("send")}
        </button>
      </form>

      {/* ── Liste des documents (grille de cartes) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
          {t("title")} — {docs.length}
        </p>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">{t("empty")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map((doc) => {
              const warning = isExpiringSoon(doc.expiresAt);
              const isPdf = doc.fileUrl?.toLowerCase().includes(".pdf") || doc.fileUrl?.includes("/raw/");
              const isImage = doc.fileUrl && !isPdf;
              return (
                <div
                  key={doc.id}
                  className={`rounded-xl border bg-white overflow-hidden transition ${
                    deletingId === doc.id ? "opacity-60" : ""
                  }`}
                >
                  {/* Aperçu fichier */}
                  {doc.fileUrl ? (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.fileUrl}
                          alt={t(doc.type)}
                          className="w-full h-32 object-cover bg-gray-50 hover:opacity-90 transition"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition">
                          <ExternalLink size={24} className="text-gray-300" />
                          <span className="text-[10px] text-gray-400 font-medium">PDF</span>
                        </div>
                      )}
                    </a>
                  ) : (
                    <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2">
                      <Upload size={24} className="text-gray-200" />
                      <span className="text-[10px] text-gray-300">—</span>
                    </div>
                  )}

                  <div className="p-3">
                    {/* Type + statut + actions */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                            TYPE_COLOR[doc.type] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {t(doc.type)}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              STATUS_BADGE[doc.status] ?? "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {t(`docStatus.${doc.status}`)}
                          </span>
                          {warning && doc.status !== "EXPIRED" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                              ⚠ {t("expiringSoon")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(doc)}
                          disabled={doc.status !== "RECEIVED"}
                          title={doc.status !== "RECEIVED" ? t("cannotDelete") : t("edit")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0f5132] hover:bg-[#0f5132]/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id || doc.status !== "RECEIVED"}
                          title={doc.status !== "RECEIVED" ? t("cannotDelete") : t("delete")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Détails */}
                    <p className="text-xs font-semibold text-gray-700 truncate leading-tight">
                      {doc.label ?? t(doc.type)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {t("uploadedOn")} {new Date(doc.createdAt).toLocaleDateString()}
                      {doc.expiresAt && (
                        <>
                          {" · "}
                          {t("expires")} {new Date(doc.expiresAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                    {doc.status === "REJECTED" && doc.notes && (
                      <p className="text-xs text-red-500 mt-1.5">
                        <span className="font-semibold">{t("rejectedReason")} :</span> {doc.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── Modal d'édition ── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Pencil size={15} /> {t("editTitle")} — {t(editing.type)}
              </h3>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("label")}</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("expiresAt")}</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("changeFile")}</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0f5132]/10 file:text-[#0f5132] file:font-semibold file:cursor-pointer"
                />
                {editFile && <p className="text-[10px] text-gray-400 mt-1">{editFile.name}</p>}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0d4429] transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
