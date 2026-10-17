import type postgres from "postgres";
type Q = postgres.Sql;
const SEL = (q: Q) => q`id, nombre, left(hora_inicio::text, 5) as hora_inicio, left(hora_fin::text, 5) as hora_fin, dias_semana, activo, orden`;
type F = { nombre: string; hora_inicio: string; hora_fin: string; dias_semana: number[]; activo: boolean; orden: number };

export const listar = (q: Q) => q`select ${SEL(q)} from franjas order by orden, hora_inicio, id`;
export const porId = async (q: Q, id: number) => (await q`select ${SEL(q)} from franjas where id = ${id}`)[0];

export const crear = async (q: Q, f: F) =>
  (await q`insert into franjas (nombre, hora_inicio, hora_fin, dias_semana, activo, orden)
           values (${f.nombre}, ${f.hora_inicio}::time, ${f.hora_fin}::time, ${q.array(f.dias_semana, 21)}::smallint[], ${f.activo}, ${f.orden})
           returning ${SEL(q)}`)[0];

export const guardar = async (q: Q, id: number, f: F) =>
  (await q`update franjas set nombre = ${f.nombre}, hora_inicio = ${f.hora_inicio}::time, hora_fin = ${f.hora_fin}::time,
           dias_semana = ${q.array(f.dias_semana, 21)}::smallint[], activo = ${f.activo}, orden = ${f.orden}
           where id = ${id} returning ${SEL(q)}`)[0];

export const eliminar = async (q: Q, id: number) => (await q`delete from franjas where id = ${id} returning id`)[0];
