import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { ahoraLima, dentroDeFranja } from "@/lib/tiempo";
import type postgres from "postgres";
import type { z } from "zod";
import type { abrirTurno, arqueoNuevo, cerrarTurno, Detalle } from "@/shared/schemas";
import type { filtrosTurnos, turnoCambio, arqueoCambio } from "@/shared/caja";
import * as turnos from "../repos/turnos";
import * as yapes from "../repos/yapes";
import * as franjas from "./franjas";

const r2 = (n: number) => Math.round(n * 100) / 100;
const total = (d: Detalle) => r2(d.reduce((a, x) => a + x.denominacion * x.cantidad, 0));
const duplicado = (e: unknown) => (e as { code?: string }).code === "23505";

export async function estado() {
  const t = await turnos.actual(sql);
  const intervaloCuadreMin = await turnos.intervaloCuadre(sql);
  if (!t) return { turno: null, totalYapes: 0, cantidadYapes: 0, ultimoArqueoAt: null, intervaloCuadreMin };
  const res = await yapes.resumen(sql, t.id);
  return { turno: t, totalYapes: res.total, cantidadYapes: res.n, ultimoArqueoAt: await turnos.ultimoArqueoAt(sql, t.id), intervaloCuadreMin };
}

export const abrir = (uid: string, input: z.infer<typeof abrirTurno>) => conUsuario(uid, async (q) => {
  const advertencias: string[] = [];
  if (input.franjaId) {
    const fr = await franjas.porId(q, input.franjaId);
    if (!fr) throw new HttpError(404, "Franja no encontrada");
    if (!fr.activo) throw new HttpError(409, "Esa franja está desactivada");
    if (!dentroDeFranja(fr)) advertencias.push(`Abriste fuera del horario de "${fr.nombre}" (${fr.hora_inicio}–${fr.hora_fin})`);
  }
  const anterior = await turnos.ultimoCierre(q);
  let t;
  try { t = await turnos.abrir(q, uid, input.franjaId ?? null); }
  catch (e) { if (duplicado(e)) throw new HttpError(409, "Ya hay un turno abierto"); throw e; }
  const contado = total(input.detalle);
  await turnos.insertarArqueo(q, t.id, "inicio", contado, null, input.detalle);
  const dif = anterior == null ? null : r2(contado - anterior);
  if (dif) advertencias.push(`El conteo inicial difiere ${dif} del cierre anterior`);
  return { turno: t, totalContado: contado, cierreAnterior: anterior, diferenciaConCierreAnterior: dif, advertencias };
});

async function arquear(q: postgres.Sql, turnoId: number, tipo: string, detalle: Detalle, sistema: number) {
  const t = await turnos.actual(q);
  if (!t || t.id !== turnoId) throw new HttpError(409, "Ese turno no está abierto");
  const contado = total(detalle);
  const a = await turnos.insertarArqueo(q, turnoId, tipo, contado, sistema, detalle);
  return { totalContado: contado, sistemaEfectivo: sistema, diferencia: a.diferencia as number };
}

export const cuadrar = (uid: string, turnoId: number, input: z.infer<typeof arqueoNuevo>) =>
  conUsuario(uid, (q) => arquear(q, turnoId, input.tipo, input.detalle, input.sistemaEfectivo));

export const cerrar = (uid: string, turnoId: number, input: z.infer<typeof cerrarTurno>) => conUsuario(uid, async (q) => {
  const r = await arquear(q, turnoId, "cierre", input.detalle, input.sistemaEfectivo);
  await turnos.cerrar(q, turnoId);
  return { ...r, yapes: await yapes.resumen(q, turnoId) };
});

// ───────── Consulta y corrección ─────────
export const listar = (f: z.infer<typeof filtrosTurnos>) => turnos.listar(sql, f);

export async function detalle(id: number) {
  const t = await turnos.porIdAny(sql, id);
  if (!t) throw new HttpError(404, "Turno no encontrado");
  return { ...t, yapes: await yapes.resumen(sql, id), arqueos: await turnos.arqueosDe(sql, id) };
}

export const cambiar = (uid: string, id: number, i: z.infer<typeof turnoCambio>) => conUsuario(uid, async (q) => {
  const t = await turnos.porIdAny(q, id);
  if (!t) throw new HttpError(404, "Turno no encontrado");
  if (i.cerradoAt && t.estado === "abierto") throw new HttpError(409, "El turno sigue abierto: ciérralo antes de poner la hora de cierre");
  const abre = new Date(i.abiertoAt ?? t.abierto_at).getTime();
  const cierra = i.cerradoAt ? new Date(i.cerradoAt).getTime() : t.cerrado_at ? new Date(t.cerrado_at).getTime() : null;
  if (cierra !== null && cierra < abre) throw new HttpError(400, "El cierre no puede ser anterior a la apertura");
  if (i.franjaId && !(await franjas.porId(q, i.franjaId))) throw new HttpError(404, "Franja no encontrada");
  const c: Record<string, unknown> = {};
  if (i.franjaId !== undefined) c.franja_id = i.franjaId;
  if (i.abiertoAt) c.abierto_at = i.abiertoAt;
  if (i.cerradoAt) c.cerrado_at = i.cerradoAt;
  return turnos.actualizarTurno(q, id, c);
});

/** Un turno cerrado por error vuelve a quedar abierto (el arqueo de cierre se descarta). */
export const reabrir = (uid: string, id: number) => conUsuario(uid, async (q) => {
  const t = await turnos.porIdAny(q, id);
  if (!t) throw new HttpError(404, "Turno no encontrado");
  if (t.estado === "abierto") throw new HttpError(409, "El turno ya está abierto");
  try { await turnos.reabrir(q, id); }
  catch (e) { if (duplicado(e)) throw new HttpError(409, "Ya hay otro turno abierto"); throw e; }
  return turnos.porIdAny(q, id);
});

export const eliminar = (uid: string, id: number) => conUsuario(uid, async (q) => {
  const t = await turnos.porIdAny(q, id);
  if (!t) throw new HttpError(404, "Turno no encontrado");
  if (t.estado === "abierto") throw new HttpError(409, "Cierra el turno antes de eliminarlo");
  await turnos.turnoAPapelera(q, id);
  return { ok: true };
});

export const cambiarArqueo = (uid: string, id: number, i: z.infer<typeof arqueoCambio>) => conUsuario(uid, async (q) => {
  if (!(await turnos.arqueoPorId(q, id))) throw new HttpError(404, "Arqueo no encontrado");
  if (i.detalle) await turnos.reemplazarDetalle(q, id, i.detalle);
  return turnos.actualizarArqueo(q, id, i.detalle ? total(i.detalle) : null, i.sistemaEfectivo !== undefined, i.sistemaEfectivo ?? null);
});

export const eliminarArqueo = (uid: string, id: number) => conUsuario(uid, async (q) => {
  if (!(await turnos.arqueoAPapelera(q, id))) throw new HttpError(404, "Arqueo no encontrado");
  return { ok: true };
});
