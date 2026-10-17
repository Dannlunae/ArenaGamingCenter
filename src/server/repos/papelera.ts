import type postgres from "postgres";
type Q = postgres.Sql;
export type Tipo = "yapes" | "comentarios" | "turnos" | "arqueos" | "pcs" | "notas";
export const TABLA: Record<Tipo, string> = { yapes: "yapes", comentarios: "comentarios", turnos: "turnos", arqueos: "arqueos", pcs: "pcs", notas: "pc_notas" };

export const conteos = async (q: Q) => (await q`
  select (select count(*) from yapes where eliminado_at is not null) as yapes,
         (select count(*) from comentarios where eliminado_at is not null) as comentarios,
         (select count(*) from turnos where eliminado_at is not null) as turnos,
         (select count(*) from arqueos where eliminado_at is not null) as arqueos,
         (select count(*) from pcs where eliminado_at is not null) as pcs,
         (select count(*) from pc_notas where eliminado_at is not null) as notas`)[0];

export function listar(q: Q, tipo: Tipo) {
  switch (tipo) {
    case "yapes": return q`select id, monto::float8 as monto, emisor, fecha, turno_id, eliminado_at from yapes where eliminado_at is not null order by eliminado_at desc limit 200`;
    case "comentarios": return q`select id, texto, turno_id, eliminado_at from comentarios where eliminado_at is not null order by eliminado_at desc limit 200`;
    case "turnos": return q`select id, estado, abierto_at, cerrado_at, eliminado_at from turnos where eliminado_at is not null order by eliminado_at desc limit 200`;
    case "arqueos": return q`select id, turno_id, tipo, at, total_contado::float8 as total_contado, eliminado_at from arqueos where eliminado_at is not null order by eliminado_at desc limit 200`;
    case "pcs": return q`select id, nombre, estado, eliminado_at from pcs where eliminado_at is not null order by eliminado_at desc limit 200`;
    case "notas": return q`select n.id, n.pc_id, p.nombre as pc, n.comentario, n.fecha, n.eliminado_at from pc_notas n join pcs p on p.id = n.pc_id where n.eliminado_at is not null order by n.eliminado_at desc limit 200`;
  }
}

/** Devuelve el motivo por el que NO se puede restaurar (o null si se puede). */
export async function bloqueo(q: Q, tipo: Tipo, id: number): Promise<string | null> {
  const [r] = tipo === "yapes" ? await q`select (t.eliminado_at is not null) as b from yapes y left join turnos t on t.id = y.turno_id where y.id = ${id}`
    : tipo === "comentarios" ? await q`select (t.eliminado_at is not null) as b from comentarios c left join turnos t on t.id = c.turno_id where c.id = ${id}`
    : tipo === "arqueos" ? await q`select (t.eliminado_at is not null) as b from arqueos a join turnos t on t.id = a.turno_id where a.id = ${id}`
    : tipo === "notas" ? await q`select (p.eliminado_at is not null) as b from pc_notas n join pcs p on p.id = n.pc_id where n.id = ${id}`
    : [];
  if (!r?.b) return null;
  return tipo === "notas" ? "Restaura primero la PC" : "Restaura primero el turno";
}

export const restaurar = async (q: Q, tipo: Tipo, id: number) =>
  (await q`update ${q(TABLA[tipo])} set eliminado_at = null where id = ${id} and eliminado_at is not null returning id`)[0];

export const purgar = (q: Q, dias: number) => q`select purgar_papelera(${dias}::int)`;
