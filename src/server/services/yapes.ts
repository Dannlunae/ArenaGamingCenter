import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type { z } from "zod";
import type { yapeNuevo, yapeCambio, ordenYapes } from "@/shared/schemas";
import * as yapes from "../repos/yapes";
import * as turnos from "../repos/turnos";

export const listar = (turnoId: number) => yapes.listar(sql, turnoId);

export const crear = (uid: string, input: z.infer<typeof yapeNuevo>) => conUsuario(uid, async (q) => {
  const t = await turnos.actual(q);
  if (!t) throw new HttpError(409, "Abre un turno primero");
  return yapes.insertar(q, t.id, input);
});

export const cambiar = (uid: string, id: number, input: z.infer<typeof yapeCambio>) => conUsuario(uid, async (q) => {
  const r = await yapes.actualizar(q, id, input);
  if (!r) throw new HttpError(404, "Yape no encontrado");
  return r;
});

export const eliminar = (uid: string, id: number) => conUsuario(uid, async (q) => {
  if (!(await yapes.aPapelera(q, id))) throw new HttpError(404, "Yape no encontrado");
  return { ok: true };
});

export const reordenar = (uid: string, input: z.infer<typeof ordenYapes>) => conUsuario(uid, async (q) => {
  const t = await turnos.actual(q);
  if (!t) throw new HttpError(409, "No hay turno abierto");
  await yapes.reordenar(q, t.id, input.ids);
  return { ok: true };
});
