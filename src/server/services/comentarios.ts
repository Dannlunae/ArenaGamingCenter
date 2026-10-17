import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type { z } from "zod";
import type { comentarioNuevo, comentarioCambio, filtrosComentarios } from "@/shared/caja";
import * as repo from "../repos/comentarios";
import * as turnos from "../repos/turnos";

export async function listar(f: z.infer<typeof filtrosComentarios>) {
  const turnoId = f.turnoId ?? (await turnos.actual(sql))?.id ?? null;
  return repo.listar(sql, { turnoId, alcance: f.alcance, pendientes: f.pendientes === "true" });
}

export const crear = (uid: string, i: z.infer<typeof comentarioNuevo>) => conUsuario(uid, async (q) => {
  const turnoId = i.turnoId === undefined ? ((await turnos.actual(q))?.id ?? null) : i.turnoId;   // por defecto, el turno abierto
  if (turnoId && !(await turnos.porIdAny(q, turnoId))) throw new HttpError(404, "Turno no encontrado");
  return repo.insertar(q, { turnoId, autor: uid, texto: i.texto, fijado: i.fijado ?? false });
});

export const cambiar = (uid: string, id: number, i: z.infer<typeof comentarioCambio>) => conUsuario(uid, async (q) => {
  const r = await repo.actualizar(q, id, i);
  if (!r) throw new HttpError(404, "Comentario no encontrado");
  return r;
});

export const eliminar = (uid: string, id: number) => conUsuario(uid, async (q) => {
  if (!(await repo.aPapelera(q, id))) throw new HttpError(404, "Comentario no encontrado");
  return { ok: true };
});
