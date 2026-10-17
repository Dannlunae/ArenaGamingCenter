import type postgres from "postgres";
type Q = postgres.Sql;
const SEL = (q: Q) => q`id, turno_id, autor_id, texto, creado_at, fijado, hecho`;

export const listar = (q: Q, f: { turnoId: number | null; alcance: string; pendientes: boolean }) =>
  q`select ${SEL(q)} from comentarios
    where eliminado_at is null
      ${f.alcance === "todos" ? q`` : q`and (turno_id = ${f.turnoId}::bigint or (fijado and not hecho))`}
      ${f.pendientes ? q`and not hecho` : q``}
    order by hecho, fijado desc, creado_at desc limit 500`;

export const insertar = async (q: Q, d: { turnoId: number | null; autor: string; texto: string; fijado: boolean }) =>
  (await q`insert into comentarios (turno_id, autor_id, texto, fijado) values (${d.turnoId}, ${d.autor}, ${d.texto}, ${d.fijado}) returning ${SEL(q)}`)[0];

export const actualizar = async (q: Q, id: number, cambios: Record<string, unknown>) => {
  const cols = Object.keys(cambios);
  if (!cols.length) return (await q`select ${SEL(q)} from comentarios where id = ${id} and eliminado_at is null`)[0];
  return (await q`update comentarios set ${q(cambios as never, cols as never)} where id = ${id} and eliminado_at is null returning ${SEL(q)}`)[0];
};
export const aPapelera = async (q: Q, id: number) =>
  (await q`update comentarios set eliminado_at = now() where id = ${id} and eliminado_at is null returning id`)[0];
