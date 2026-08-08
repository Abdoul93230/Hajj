import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole, Permission } from "@/types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET
);

const COOKIE_NAME = "zam_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export type SessionPayload = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
  permissions: Permission[];
};

export const PLATFORM_SLUG = "__platform__";

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
