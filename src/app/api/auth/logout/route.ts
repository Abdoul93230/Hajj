import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  await deleteSession();

  // Effacer aussi les cookies annexes
  const cookieStore = await cookies();
  cookieStore.delete("zam_selected_year");
  cookieStore.delete("zam_dev_tenant");

  // Rediriger vers le bon espace login selon le referer
  const referer = req.headers.get("referer") ?? "";
  let redirectTo = "/";
  if (referer.includes("/superadmin")) redirectTo = "/superadmin/login";
  else if (referer.includes("/agency-admin")) redirectTo = "/agency-admin/login";

  return NextResponse.json({ redirectTo });
}
