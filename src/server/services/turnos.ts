import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type postgres from "postgres";
import type { z } from "zod";
import type { abrirTurno, arqueoNuevo, cerrarTurno, Detalle } from "@/shared/schemas";
import * as turnos from "../repos/turnos";
import * as yapes from "../repos/yapes";

const r2 = (n: number) => Math.round(n * 100) / 100;
const total = (d: Detalle) => r2(d.reduce((a, x) => a + x.denominacion * x.cantidad, 0));

export async function estado() {
  const t = await turnos.actual(sql);
  const intervaloCuadreMin = await turnos.intervaloCuadre(sql);
  if (!t) return { turno: null, totalYapes: 0, cantidadYapes: 0, ultimoArqueoAt: null, intervaloCuadreMin };
  const res = await yapes.resumen(sql, t.id);
  return { turno: t, totalYapes: res.total, cantidadYapes: res.n, ultimoArqueoAt: await turnos.ultimoArqueoAt(sql, t.id), intervaloCuadreMin };
}

export const abrir = (uid: string, input: z.infer<typeof abrirTurno>) => conUsuario(uid, async (q) => {
  const anterior = await turnos.ultimoCierre(q);
  let t;
  try { t = await turnos.abrir(q, uid, input.franjaId ?? null); }
  catch (e) { if ((e as { code?: string }).code === "23505") throw new HttpError(409, "Ya hay un turno abierto"); throw e; }
  const contado = total(input.detalle);
  await turnos.insertarArqueo(q, t.id, "inicio", contado, null, input.detalle);
  return { turno: t, totalContado: contado, cierreAnterior: anterior, diferenciaConCierreAnterior: anterior == null ? null : r2(contado - anterior) };
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
