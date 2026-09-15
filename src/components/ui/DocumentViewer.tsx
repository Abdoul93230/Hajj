"use client";

import { useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";

/**
 * URL de téléchargement Cloudinary.
 *
 * Le flag `fl_attachment:<nom>` force le téléchargement avec un nom de fichier
 * lisible (Cloudinary ajoute l'extension). ⚠️ Le nom ne doit contenir ni point
 * ni barre oblique, sinon Cloudinary renvoie une erreur 400.
 */
export function documentDownloadUrl(url: string, name?: string): string {
  const ascii = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return url.replace("/upload/", `/upload/fl_attachment:${ascii || "document"}/`);
}

export type DocumentViewerLabels = {
  download: string;
  openTab: string;
  close: string;
};

/**
 * Visionneuse intégrée : affiche le document (PDF ou image) dans une fenêtre
 * modale, sans quitter l'application, avec téléchargement et ouverture dans un
 * nouvel onglet en option. La touche Échap et le clic sur le fond ferment.
 */
export default function DocumentViewer({
  url,
  title,
  subtitle,
  isPdf,
  labels,
  onClose,
}: {
  url: string;
  title: string;
  subtitle?: string;
  isPdf: boolean;
  labels: DocumentViewerLabels;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title={labels.close}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Aperçu */}
        <div className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={`${url}#view=FitH`}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white">
          <a
            href={documentDownloadUrl(url, title)}
            className="flex items-center gap-2 bg-[#0f5132] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0d4429] transition"
          >
            <Download size={15} /> {labels.download}
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            <ExternalLink size={15} /> {labels.openTab}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
}