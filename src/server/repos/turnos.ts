import type postgres from "postgres";
import type { Detalle } from "@/shared/schemas";
type Q = postgres.Sql;

export const actual = async (q: Q) =>
  (await q`select id, franja_id, abierto_at from turnos where estado = 'abierto' and eliminado_at is null limit 1`)[0];

export const abrir = async (q: Q, cajeroId: string, franjaId: number | null) =>
  (await q`insert into turnos (cajero_id, franja_id) values (${cajeroId}, ${franjaId}) returning id, franja_id, abierto_at`)[0];

export const cerrar = async (q: Q, id: number) =>
  (await q`update turnos set estado = 'cerrado', cerrado_at = now() where id = ${id} and estado = 'abierto' returning id`)[0];

export const ultimoCierre = async (q: Q): Promise<number | null> =>
  (await q`select a.total_contado::float8 as t from arqueos a join turnos t on t.id = a.turno_id
           where a.tipo = 'cierre' and a.eliminado_at is null and t.eliminado_at is null
           order by a.at desc limit 1`)[0]?.t ?? null;

export const ultimoArqueoAt = async (q: Q, turnoId: number): Promise<string | null> =>
  (await q`select max(at) as at from arqueos where turno_id = ${turnoId} and eliminado_at is null`)[0]?.at ?? null;

export const intervaloCuadre = async (q: Q): Promise<number> =>
  Number((await q`select valor from ajustes where clave = 'intervalo_cuadre_min'`)[0]?.valor ?? 30);

export const insertarArqueo = async (q: Q, turnoId: number, tipo: string, total: number, sistema: number | null, detalle: Detalle) => {
  const a = (await q`insert into arqueos (turno_id, tipo, total_contado, sistema_efectivo)
                     values (${turnoId}, ${tipo}, ${total}, ${sistema}) returning id, at, diferencia::float8 as diferencia`)[0];
  const filas = detalle.map((d) => ({ arqueo_id: a.id, denominacion: d.denominacion, cantidad: d.cantidad }));
  if (filas.length) await q`insert into arqueo_detalle ${q(filas)}`;
  return a;
};
