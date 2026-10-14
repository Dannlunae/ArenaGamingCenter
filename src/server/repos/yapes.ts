import type postgres from "postgres";
type Q = postgres.Sql;
const SEL = (q: Q) => q`id, monto::float8 as monto, fecha, comentario, receptor, emisor, verificacion, turno_id, orden::float8 as orden`;

export const listar = (q: Q, turnoId: number) =>
  q`select ${SEL(q)} from yapes where turno_id = ${turnoId} and eliminado_at is null order by orden, fecha desc`;

export const insertar = async (q: Q, turnoId: number, d: { monto: number; emisor: string | null; receptor: string | null; comentario: string | null }) =>
  (await q`insert into yapes (monto, emisor, receptor, comentario, turno_id, orden)
    values (${d.monto}, ${d.emisor}, ${d.receptor}, ${d.comentario}, ${turnoId},
            (select coalesce(min(orden), 0) - 1 from yapes where turno_id = ${turnoId}))
    returning ${SEL(q)}`)[0];

export const actualizar = async (q: Q, id: number, cambios: Record<string, unknown>) => {
  const cols = Object.keys(cambios);
  if (!cols.length) return (await q`select ${SEL(q)} from yapes where id = ${id} and eliminado_at is null`)[0];
  return (await q`update yapes set ${q(cambios as never, cols as never)} where id = ${id} and eliminado_at is null returning ${SEL(q)}`)[0];
};

export const aPapelera = async (q: Q, id: number) =>
  (await q`update yapes set eliminado_at = now() where id = ${id} and eliminado_at is null returning id`)[0];

export const reordenar = (q: Q, turnoId: number, ids: number[]) =>
  q`update yapes y set orden = v.ord from unnest(${q.array(ids, 20)}::bigint[]) with ordinality as v(id, ord)
    where y.id = v.id and y.turno_id = ${turnoId}`;

export const resumen = async (q: Q, turnoId: number) =>
  (await q`select coalesce(sum(monto), 0)::float8 as total, count(*)::int as n from yapes where turno_id = ${turnoId} and eliminado_at is null`)[0];
