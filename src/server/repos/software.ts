import type postgres from "postgres";
type Q = postgres.Sql;

export const listar = (q: Q) => q`select id, nombre, tipo, activo, orden from software order by orden, id`;
export const porId = async (q: Q, id: number) => (await q`select id, nombre, tipo, activo, orden from software where id = ${id}`)[0];

export const crear = async (q: Q, d: { nombre: string; tipo: string }) => {
  const s = (await q`insert into software (nombre, tipo, orden)
    values (${d.nombre}, ${d.tipo}, (select coalesce(max(orden), 0) + 1 from software)) returning id, nombre, tipo, activo, orden`)[0];
  await q`insert into pc_software (pc_id, software_id) select id, ${s.id}::bigint from pcs`;
  return s;
};

export const actualizar = async (q: Q, id: number, cambios: Record<string, unknown>) => {
  const cols = Object.keys(cambios);
  if (!cols.length) return porId(q, id);
  return (await q`update software set ${q(cambios as never, cols as never)} where id = ${id} returning id, nombre, tipo, activo, orden`)[0];
};

export const marcar = (q: Q, softwareId: number, pcIds: number[], d: { estado: string; version: string | null; nota: string | null }) =>
  q`update pc_software set
      actualizado_at = case when ${d.estado}::text = 'al_dia' then now() else actualizado_at end,
      estado_desde = case when estado is distinct from ${d.estado}::text then now() else estado_desde end,
      estado = ${d.estado}::text,
      version = coalesce(${d.version}::text, version),
      nota = coalesce(${d.nota}::text, nota)
    where software_id = ${softwareId} and pc_id = any(${q.array(pcIds, 20)}::bigint[])`;
