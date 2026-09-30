import { redirect } from "next/navigation";

/** Entrée de la personnalisation agence → premier onglet. */
export default function AgencyPersonnalisationIndexPage() {
  redirect("/agency-admin/personalisation/couleurs");
}
