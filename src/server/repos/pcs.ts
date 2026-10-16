import type postgres from "postgres";
type Q = postgres.Sql;
type Filtros = { estado?: string; q?: string; softwareId?: number; softwareEstado?: string; conNotas?: string };
const arr = (q: Q, ids: number[]) => q.array(ids, 20);

export const listar = (q: Q, f: Filtros) => q`
  select p.id, p.nombre, p.ubicacion, p.orden, p.estado, p.motivo, p.estado_desde,
    (select count(*) from pc_notas n where n.pc_id = p.id and n.eliminado_at is null and not n.resuelta) as notas_abiertas,
    coalesce((select jsonb_agg(jsonb_build_object('softwareId', s.id, 'nombre', s.nombre, 'estado', ps.estado) order by s.orden, s.id)
              from pc_software ps join software s on s.id = ps.software_id
              where ps.pc_id = p.id and s.activo), '[]'::jsonb) as software
  from pcs p
  where p.eliminado_at is null
    ${f.estado ? q`and p.estado = ${f.estado}` : q``}
    ${f.q ? q`and p.nombre ilike ${"%" + f.q + "%"}` : q``}
    ${f.softwareId && f.softwareEstado ? q`and exists (select 1 from pc_software ps where ps.pc_id = p.id and ps.software_id = ${f.softwareId} and ps.estado = ${f.softwareEstado})` : q``}
    ${f.conNotas === "true" ? q`and exists (select 1 from pc_notas n where n.pc_id = p.id and n.eliminado_at is null and not n.resuelta)` : q``}
  order by p.orden, p.nombre`;

export const porId = async (q: Q, id: number) =>
  (await q`select id, nombre, ubicacion, orden, estado, motivo, estado_desde, creado_at from pcs where id = ${id} and eliminado_at is null`)[0];

export const softwareDe = (q: Q, pcId: number) =>
  q`select s.id as software_id, s.nombre, s.tipo, ps.estado, ps.version, ps.actualizado_at, ps.nota, ps.estado_desde
    from pc_software ps join software s on s.id = ps.software_id
    where ps.pc_id = ${pcId} and s.activo order by s.orden, s.id`;

export const crear = async (q: Q, d: { nombre: string; ubicacion: string | null; orden?: number }) => {
  const p = (await q`insert into pcs (nombre, ubicacion, orden)
    values (${d.nombre}, ${d.ubicacion}, coalesce(${d.orden ?? null}::int, (select coalesce(max(orden), 0) + 1 from pcs)))
    returning id, nombre, ubicacion, orden, estado, motivo, estado_desde`)[0];
  await q`insert into pc_software (pc_id, software_id) select ${p.id}::bigint, id from software`;
  return p;
};

export const actualizar = async (q: Q, id: number, cambios: Record<string, unknown>) => {
  const cols = Object.keys(cambios);
  if (!cols.length) return porId(q, id);
  return (await q`update pcs set ${q(cambios as never, cols as never)} where id = ${id} and eliminado_at is null
    returning id, nombre, ubicacion, orden, estado, motivo, estado_desde`)[0];
};

export const aPapelera = async (q: Q, id: number) =>
  (await q`update pcs set eliminado_at = now() where id = ${id} and eliminado_at is null returning id`)[0];

// ── estado ──
export const bloquear = (q: Q, ids: number[]) =>
  q`select id, estado, motivo from pcs where id = any(${arr(q, ids)}::bigint[]) and eliminado_at is null order by id for update`;

export const enCurso = async (q: Q, ids: number[]) => {
  const r = await q`select ps.pc_id, count(*) as n from pc_software ps join software s on s.id = ps.software_id
    where ps.pc_id = any(${arr(q, ids)}::bigint[]) and ps.estado = 'actualizando' and s.activo group by ps.pc_id`;
  return new Map<number, number>(r.map((x) => [Number(x.pc_id), Number(x.n)]));
};

export const fijarEstado = (q: Q, ids: number[], estado: string, motivo: string | null) =>
  q`update pcs set
      estado_desde = case when estado is distinct from ${estado}::text then now() else estado_desde end,
      estado = ${estado}::text, motivo = ${motivo}::text
    where id = any(${arr(q, ids)}::bigint[])`;

export const estados = (q: Q, ids: number[]) =>
  q`select id, estado from pcs where id = any(${arr(q, ids)}::bigint[]) and eliminado_at is null`;

// ── historial de estados (sale de la auditoría) ──
export const historial = (q: Q, pcId: number) =>
  q`select at, usuario_id, antes->>'estado' as desde, despues->>'estado' as hasta, despues->>'motivo' as motivo
    from auditoria
    where tabla = 'pcs' and registro_id = ${String(pcId)} and accion = 'UPDATE'
      and antes->>'estado' is distinct from despues->>'estado'
    order by at desc limit 100`;

// ── resumen ──
export const resumen = async (q: Q) => {
  const porEstado = await q`select estado, count(*) as n from pcs where eliminado_at is null group by estado`;
  const sw = await q`select s.id, s.nombre, ps.estado, count(*) as n
    from pc_software ps join software s on s.id = ps.software_id join pcs p on p.id = ps.pc_id and p.eliminado_at is null
    where s.activo group by s.id, s.nombre, s.orden, ps.estado order by s.orden, s.id`;
  const notas = (await q`select count(distinct pc_id) as n from pc_notas where not resuelta and eliminado_at is null`)[0];
  return { porEstado, sw, pcsConNotasAbiertas: Number(notas.n) };
};
