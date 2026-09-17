import { redirect } from "next/navigation";

export default async function PersonnalisationIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/superadmin/tenants/${id}/personnalisation/couleurs`);
}