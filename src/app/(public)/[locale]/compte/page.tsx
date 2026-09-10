import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CompteClient from "./CompteClient";

// /compte — connexion / inscription pèlerin.


export default async function ComptePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (session?.role === "PILGRIM") {
    redirect(`/${locale}/compte/mon-dossier`);
  }
  return <CompteClient />;
}