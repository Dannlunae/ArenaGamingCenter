import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { ahoraLima, dentroDeFranja } from "@/lib/tiempo";
import type { z } from "zod";
import type { franjaNueva, franjaCambio } from "@/shared/caja";
import * as repo from "../repos/franjas";

const norm = (f: any) => ({ ...f, dias_semana: Array.from(f.dias_semana as ArrayLike<unknown>).map(Number) }) as {
  id: number; nombre: string; hora_inicio: string; hora_fin: string; dias_semana: number[]; activo: boolean; orden: number;
};
const check = (e: unknown) => {
  if ((e as { code?: string }).code === "23514") throw new HttpError(400, "La hora de inicio y la de fin no pueden ser iguales");
  throw e;
};

export async function listar(vigente?: boolean) {
  const todas = (await repo.listar(sql)).map(norm);
  if (!vigente) return todas;
  const ahora = ahoraLima();
  return todas.filter((f) => f.activo && dentroDeFranja(f, ahora));
}
export async function porId(q: typeof sql, id: number) {
  const f = await repo.porId(q, id);
  return f ? norm(f) : null;
}

export const crear = (uid: string, i: z.infer<typeof franjaNueva>) => conUsuario(uid, async (q) => {
  try {
    return norm(await repo.crear(q, { nombre: i.nombre, hora_inicio: i.horaInicio, hora_fin: i.horaFin, dias_semana: i.diasSemana ?? [1, 2, 3, 4, 5, 6, 7], activo: i.activo ?? true, orden: i.orden ?? 0 }));
  } catch (e) { return check(e); }
});

export const cambiar = (uid: string, id: number, i: z.infer<typeof franjaCambio>) => conUsuario(uid, async (q) => {
  const a = await porId(q, id);
  if (!a) throw new HttpError(404, "Franja no encontrada");
  try {
    return norm(await repo.guardar(q, id, {
      nombre: i.nombre ?? a.nombre, hora_inicio: i.horaInicio ?? a.hora_inicio, hora_fin: i.horaFin ?? a.hora_fin,
      dias_semana: i.diasSemana ?? a.dias_semana, activo: i.activo ?? a.activo, orden: i.orden ?? a.orden,
    }));
  } catch (e) { return check(e); }
});

export const eliminar = (uid: string, id: number) => conUsuario(uid, async (q) => {
  if (!(await repo.eliminar(q, id))) throw new HttpError(404, "Franja no encontrada");
  return { ok: true };       // los turnos que la usaban quedan sin franja
});
