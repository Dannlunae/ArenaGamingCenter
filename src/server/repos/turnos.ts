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

type Foto = { yapesTotal: number; yapesCantidad: number; sistemaTotal: number | null };
export const insertarArqueo = async (q: Q, turnoId: number, tipo: string, total: number, sistema: number | null, detalle: Detalle, foto?: Foto) => {
  const a = (await q`insert into arqueos (turno_id, tipo, total_contado, sistema_efectivo, yapes_total, yapes_cantidad, sistema_total)
                     values (${turnoId}, ${tipo}, ${total}, ${sistema}, ${foto?.yapesTotal ?? null}, ${foto?.yapesCantidad ?? null}, ${foto?.sistemaTotal ?? null})
                     returning id, at, diferencia::float8 as diferencia, diferencia_total::float8 as diferencia_total`)[0];
  const filas = detalle.map((d) => ({ arqueo_id: a.id, denominacion: d.denominacion, cantidad: d.cantidad }));
  if (filas.length) await q`insert into arqueo_detalle ${q(filas)}`;
  return a;
};

// ───────── Consulta y corrección de turnos / arqueos ─────────
export const porIdAny = async (q: Q, id: number) =>
  (await q`select id, estado, abierto_at, cerrado_at, franja_id from turnos where id = ${id} and eliminado_at is null`)[0];

export const listar = (q: Q, f: { desde?: string; hasta?: string; estado?: string; limite: number }) => q`
  select t.id, t.estado, t.abierto_at, t.cerrado_at, t.franja_id, fr.nombre as franja,
    (select coalesce(sum(y.monto), 0)::float8 from yapes y where y.turno_id = t.id and y.eliminado_at is null) as total_yapes,
    (select count(*)::int from yapes y where y.turno_id = t.id and y.eliminado_at is null) as cantidad_yapes,
    (select a.total_contado::float8 from arqueos a where a.turno_id = t.id and a.tipo = 'inicio' and a.eliminado_at is null order by a.at limit 1) as contado_inicio,
    (select a.total_contado::float8 from arqueos a where a.turno_id = t.id and a.tipo = 'cierre' and a.eliminado_at is null order by a.at desc limit 1) as contado_cierre,
    (select a.sistema_efectivo::float8 from arqueos a where a.turno_id = t.id and a.tipo = 'cierre' and a.eliminado_at is null order by a.at desc limit 1) as sistema_cierre,
    (select a.diferencia::float8 from arqueos a where a.turno_id = t.id and a.tipo = 'cierre' and a.eliminado_at is null order by a.at desc limit 1) as diferencia_cierre,
    (select a.diferencia_total::float8 from arqueos a where a.turno_id = t.id and a.tipo = 'cierre' and a.eliminado_at is null order by a.at desc limit 1) as diferencia_total_cierre
  from turnos t left join franjas fr on fr.id = t.franja_id
  where t.eliminado_at is null
    ${f.estado ? q`and t.estado = ${f.estado}` : q``}
    ${f.desde ? q`and t.abierto_at >= (${f.desde}::date)::timestamp at time zone 'America/Lima'` : q``}
    ${f.hasta ? q`and t.abierto_at < (${f.hasta}::date + 1)::timestamp at time zone 'America/Lima'` : q``}
  order by t.abierto_at desc limit ${f.limite}`;

export const arqueosDe = (q: Q, turnoId: number) => q`
  select a.id, a.tipo, a.at, a.total_contado::float8 as total_contado, a.sistema_efectivo::float8 as sistema_efectivo, a.diferencia::float8 as diferencia,
    a.yapes_total::float8 as yapes_total, a.yapes_cantidad, a.sistema_total::float8 as sistema_total, a.diferencia_total::float8 as diferencia_total,
    coalesce((select jsonb_agg(jsonb_build_object('denominacion', d.denominacion::float8, 'cantidad', d.cantidad, 'subtotal', d.subtotal::float8) order by d.denominacion desc)
              from arqueo_detalle d where d.arqueo_id = a.id), '[]'::jsonb) as detalle
  from arqueos a where a.turno_id = ${turnoId} and a.eliminado_at is null order by a.at`;

export const actualizarTurno = async (q: Q, id: number, c: Record<string, unknown>) => {
  const cols = Object.keys(c);
  if (!cols.length) return porIdAny(q, id);
  return (await q`update turnos set ${q(c as never, cols as never)} where id = ${id} and eliminado_at is null
                  returning id, estado, abierto_at, cerrado_at, franja_id`)[0];
};
export const reabrir = async (q: Q, id: number) => {
  const r = (await q`update turnos set estado = 'abierto', cerrado_at = null where id = ${id} and estado = 'cerrado' and eliminado_at is null returning id`)[0];
  if (r) await q`update arqueos set eliminado_at = now() where turno_id = ${id} and tipo = 'cierre' and eliminado_at is null`;
  return r;
};
export const turnoAPapelera = async (q: Q, id: number) =>
  (await q`update turnos set eliminado_at = now() where id = ${id} and eliminado_at is null returning id`)[0];

export const arqueoPorId = async (q: Q, id: number) =>
  (await q`select id, turno_id, tipo from arqueos where id = ${id} and eliminado_at is null`)[0];
export const actualizarArqueo = async (q: Q, id: number, total: number | null, tocaSistema: boolean, sistema: number | null, tocaTotal: boolean, sistemaTotal: number | null) =>
  (await q`update arqueos set total_contado = coalesce(${total}::numeric, total_contado),
           sistema_efectivo = case when ${tocaSistema}::boolean then ${sistema}::numeric else sistema_efectivo end,
           sistema_total = case when ${tocaTotal}::boolean then ${sistemaTotal}::numeric else sistema_total end
           where id = ${id}
           returning id, turno_id, tipo, at, total_contado::float8 as total_contado, sistema_efectivo::float8 as sistema_efectivo, diferencia::float8 as diferencia,
                     yapes_total::float8 as yapes_total, sistema_total::float8 as sistema_total, diferencia_total::float8 as diferencia_total`)[0];
export const reemplazarDetalle = async (q: Q, arqueoId: number, detalle: Detalle) => {
  await q`delete from arqueo_detalle where arqueo_id = ${arqueoId}`;
  const filas = detalle.map((d) => ({ arqueo_id: arqueoId, denominacion: d.denominacion, cantidad: d.cantidad }));
  if (filas.length) await q`insert into arqueo_detalle ${q(filas)}`;
};
export const arqueoAPapelera = async (q: Q, id: number) =>
  (await q`update arqueos set eliminado_at = now() where id = ${id} and eliminado_at is null returning id`)[0];

// ───────── Vista previa del cuadre ─────────
export const ultimoArqueo = async (q: Q, turnoId: number) =>
  (await q`select id, tipo, at, total_contado::float8 as total_contado, sistema_efectivo::float8 as sistema_efectivo, diferencia::float8 as diferencia,
                  yapes_total::float8 as yapes_total, sistema_total::float8 as sistema_total, diferencia_total::float8 as diferencia_total
           from arqueos where turno_id = ${turnoId} and eliminado_at is null order by at desc limit 1`)[0];

export const yapesHasta = (q: Q, turnoId: number, hasta: string) =>
  q`select id, fecha, to_char(fecha at time zone 'America/Lima', 'YYYY-MM-DD HH24:MI:SS') as fecha_lima,
           to_char(fecha at time zone 'America/Lima', 'HH24:MI') as hora, monto::float8 as monto, emisor, receptor, verificacion
    from yapes where turno_id = ${turnoId} and eliminado_at is null and fecha <= ${hasta}::timestamptz order by fecha, id`;
