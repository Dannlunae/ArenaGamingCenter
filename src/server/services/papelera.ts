import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type { z } from "zod";
import type { filtrosPapelera, restaurar as restaurarSchema, purgar as purgarSchema } from "@/shared/caja";
import * as repo from "../repos/papelera";

export async function listar(f: z.infer<typeof filtrosPapelera>) {
  if (!f.tipo) {
    const c = await repo.conteos(sql);
    return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Number(v)]));
  }
  return repo.listar(sql, f.tipo);
}

export const restaurar = (uid: string, i: z.infer<typeof restaurarSchema>) => conUsuario(uid, async (q) => {
  const motivo = await repo.bloqueo(q, i.tipo, i.id);
  if (motivo) throw new HttpError(409, motivo);
  try {
    if (!(await repo.restaurar(q, i.tipo, i.id))) throw new HttpError(404, "No está en la papelera");
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      throw new HttpError(409, i.tipo === "turnos" ? "Ya hay un turno abierto" : "Ya existe una PC con ese nombre");
    throw e;
  }
  return { ok: true };
});

export const purgar = (uid: string, i: z.infer<typeof purgarSchema>) => conUsuario(uid, async (q) => {
  await repo.purgar(q, i.dias);
  return { ok: true, dias: i.dias };
});
