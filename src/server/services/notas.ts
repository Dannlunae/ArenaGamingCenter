import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type { z } from "zod";
import type { notaNueva, notaCambio, filtrosNotas } from "@/shared/pcs";
import * as repo from "../repos/notas";
import * as pcs from "../repos/pcs";

export const listar = (f: z.infer<typeof filtrosNotas>) => repo.listar(sql, f);

export const crear = (uid: string, pcId: number, input: z.infer<typeof notaNueva>) => conUsuario(uid, async (q) => {
  if (!(await pcs.porId(q, pcId))) throw new HttpError(404, "PC no encontrada");
  return repo.insertar(q, pcId, uid, input);
});

export const cambiar = (uid: string, id: number, input: z.infer<typeof notaCambio>) => conUsuario(uid, async (q) => {
  const r = await repo.actualizar(q, id, input);
  if (!r) throw new HttpError(404, "Nota no encontrada");
  return r;
});

export const eliminar = (uid: string, id: number) => conUsuario(uid, async (q) => {
  if (!(await repo.aPapelera(q, id))) throw new HttpError(404, "Nota no encontrada");
  return { ok: true };
});
