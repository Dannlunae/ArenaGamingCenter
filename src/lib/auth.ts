import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { HttpError } from "./errors";

// Capa de sesión aislada: para sumar usuarios después (Supabase Auth) solo se cambia este archivo.
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET!);
const h = (s: string) => createHash("sha256").update(s).digest();

export async function iniciarSesion(password: string) {
  if (!timingSafeEqual(h(password), h(process.env.ADMIN_PASSWORD ?? ""))) throw new HttpError(401, "Contraseña incorrecta");
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: "HS256" })
    .setSubject(process.env.ADMIN_ID!).setExpirationTime("7d").sign(key());
  (await cookies()).set("s", jwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 604800 });
}
export async function cerrarSesion() { (await cookies()).delete("s"); }

export async function sesion(): Promise<string | null> {
  const c = (await cookies()).get("s")?.value;
  if (!c) return null;
  try { return (await jwtVerify(c, key())).payload.sub ?? null; } catch { return null; }
}
export async function requireUser() {
  const u = await sesion();
  if (!u) throw new HttpError(401, "No autorizado");
  return u;
}
