import { redirect } from "next/navigation";
import { requireAgencySession } from "@/lib/permissions";
import ChangePasswordClient from "./ChangePasswordClient";

/**
 * Page « Changer mon mot de passe » — accès depuis le bouton 🔑 du footer
 * de la sidebar. Le changement imposé (1re connexion) reste géré par la
 * modale non contournable ForcePasswordChange du layout.
 */
export default async function ChangePasswordPage() {
  const { session, error } = await requireAgencySession();
  if (error || !session) redirect("/agency-admin/login");

  return <ChangePasswordClient />;
}
