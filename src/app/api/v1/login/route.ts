import { z } from "zod";
import { api } from "@/lib/http";
import { HttpError } from "@/lib/errors";
import { iniciarSesion, cerrarSesion } from "@/lib/auth";
import { ipDe, verificarBloqueo, registrarIntento } from "@/lib/ratelimit";

export const POST = api(async (req: Request) => {
  const { password } = z.object({ password: z.string() }).parse(await req.json());
  const ip = ipDe(req);
  await verificarBloqueo(ip);
  try { await iniciarSesion(password); }
  catch (e) { if (e instanceof HttpError && e.status === 401) await registrarIntento(ip, false); throw e; }
  await registrarIntento(ip, true);
  return { ok: true };
});
export const DELETE = api(async () => { await cerrarSesion(); return { ok: true }; });
