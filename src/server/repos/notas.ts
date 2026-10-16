import type postgres from "postgres";
type Q = postgres.Sql;
const SEL = (q: Q) => q`n.id, n.pc_id, p.nombre as pc, n.fecha, n.comentario, n.resuelta, n.autor_id`;

export const listar = (q: Q, f: { pcId?: number; abiertas?: string }) =>
  q`select ${SEL(q)} from pc_notas n join pcs p on p.id = n.pc_id
    where n.eliminado_at is null and p.eliminado_at is null
      ${f.pcId ? q`and n.pc_id = ${f.pcId}` : q``}
      ${f.abiertas === "true" ? q`and not n.resuelta` : q``}
    order by n.fecha desc, n.id desc`;

export const insertar = async (q: Q, pcId: number, autor: string, d: { comentario: string; fecha?: string }) =>
  (await q`insert into pc_notas (pc_id, comentario, fecha, autor_id)
    values (${pcId}, ${d.comentario}, coalesce(${d.fecha ?? null}::timestamptz, now()), ${autor}) returning id, pc_id, fecha, comentario, resuelta, autor_id`)[0];

export const actualizar = async (q: Q, id: number, cambios: Record<string, unknown>) => {
  const cols = Object.keys(cambios);
  if (!cols.length) return (await q`select id, pc_id, fecha, comentario, resuelta, autor_id from pc_notas where id = ${id} and eliminado_at is null`)[0];
  return (await q`update pc_notas set ${q(cambios as never, cols as never)} where id = ${id} and eliminado_at is null
    returning id, pc_id, fecha, comentario, resuelta, autor_id`)[0];
};

export const aPapelera = async (q: Q, id: number) =>
  (await q`update pc_notas set eliminado_at = now() where id = ${id} and eliminado_at is null returning id`)[0];
