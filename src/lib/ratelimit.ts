import { sql } from "./db";
import { HttpError } from "./errors";

export const ipDe = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";

/** Bloquea tras 5 fallos desde la misma IP (o 50 en total) en 15 minutos. */
export async function verificarBloqueo(ip: string) {
  const [r] = await sql`select count(*) filter (where ip = ${ip}) as ip_n, count(*) as total
                        from login_intentos where not ok and at > now() - interval '15 minutes'`;
  if (Number(r.ip_n) >= 5 || Number(r.total) >= 50) throw new HttpError(429, "Demasiados intentos fallidos. Espera 15 minutos.");
}
export async function registrarIntento(ip: string, ok: boolean) {
  await sql`insert into login_intentos (ip, ok) values (${ip}, ${ok})`;
  if (ok) await sql`delete from login_intentos where ip = ${ip} and not ok`;
  await sql`delete from login_intentos where at < now() - interval '1 day'`;
}
