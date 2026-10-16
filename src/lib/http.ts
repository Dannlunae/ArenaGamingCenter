import { ZodError } from "zod";
import { HttpError } from "./errors";

/** Envuelve un handler: JSON de salida y errores → códigos HTTP. */
export function api<A extends unknown[]>(fn: (...a: A) => Promise<unknown>, status = 200) {
  return async (...a: A) => {
    try { return Response.json(await fn(...a), { status }); }
    catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return Response.json({ error: "Datos inválidos", detalle: e.flatten() }, { status: 400 });
      console.error(e);
      return Response.json({ error: "Error interno" }, { status: 500 });
    }
  };
}
export type Ctx = { params: Promise<{ id: string }> };
export async function idDe(ctx: Ctx) {
  const n = Number((await ctx.params).id);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "id inválido");
  return n;
}

export type Ctx2 = { params: Promise<{ id: string; softwareId: string }> };
export function entero(v: string) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "id inválido");
  return n;
}
