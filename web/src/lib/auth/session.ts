import { cookies } from "next/headers";
import { signJwt, verifyJwt, JwtPayload } from "./jwt";

const COOKIE_NAME = "fd_session";

export async function createSession(
  user: { id: string; email: string; role: string },
  rememberMe = false
) {
  const token = await signJwt(
    { sub: user.id, email: user.email, role: user.role, purpose: "session" },
    rememberMe ? "30d" : "6h"
  );
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload || payload.purpose !== "session") return null;
  return payload;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
