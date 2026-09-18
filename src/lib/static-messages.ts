// Fichier serveur léger : charge les messages statiques d'une langue.
// Même mécanisme que src/i18n/request.ts (import dynamique résolu au build).
export async function getStaticMessages(
  locale: "fr" | "en" | "ar"
): Promise<Record<string, unknown>> {
  return (await import(`../messages/${locale}/index.json`)).default as Record<string, unknown>;
}
