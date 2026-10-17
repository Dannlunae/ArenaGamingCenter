import type postgres from "postgres";
type Q = postgres.Sql;
export type FiltroYapes = {
  desde?: string; hasta?: string; turnoId?: number;
  franja?: { hi: string; hf: string; dias: number[] | null };
  verificacion?: string; emisor?: string;
};

// Base común: yapes vivos, de turnos no eliminados, con su fecha en hora de Lima (x.l).
const base = (q: Q, f: FiltroYapes) => q`
  from yapes y
  left join turnos t on t.id = y.turno_id
  cross join lateral (select y.fecha at time zone 'America/Lima' as l) x
  where y.eliminado_at is null and t.eliminado_at is null
  ${f.desde ? q`and y.fecha >= (${f.desde}::date)::timestamp at time zone 'America/Lima'` : q``}
  ${f.hasta ? q`and y.fecha < (${f.hasta}::date + 1)::timestamp at time zone 'America/Lima'` : q``}
  ${f.turnoId ? q`and y.turno_id = ${f.turnoId}` : q``}
  ${f.franja ? q`and (case when ${f.franja.hi}::time < ${f.franja.hf}::time
                           then (x.l::time >= ${f.franja.hi}::time and x.l::time < ${f.franja.hf}::time)
                           else (x.l::time >= ${f.franja.hi}::time or x.l::time < ${f.franja.hf}::time) end)` : q``}
  ${f.franja?.dias ? q`and extract(isodow from (case when ${f.franja.hi}::time > ${f.franja.hf}::time and x.l::time < ${f.franja.hf}::time
                                                    then x.l - interval '1 day' else x.l end))::int = any(${q.array(f.franja.dias, 23)}::int[])` : q``}
  ${f.verificacion === "verificado" ? q`and y.verificacion is true` : q``}
  ${f.verificacion === "falso" ? q`and y.verificacion is false` : q``}
  ${f.verificacion === "sin_revisar" ? q`and y.verificacion is null` : q``}
  ${f.emisor ? q`and y.emisor ilike ${"%" + f.emisor + "%"}` : q``}`;

export const totales = async (q: Q, f: FiltroYapes) =>
  (await q`select coalesce(sum(y.monto), 0)::float8 as total, count(*)::int as cantidad ${base(q, f)}`)[0];

export const agrupado = (q: Q, f: FiltroYapes, por: "turno" | "dia" | "mes") =>
  por === "turno"
    ? q`select y.turno_id::text as clave, to_char(min(t.abierto_at) at time zone 'America/Lima', 'YYYY-MM-DD HH24:MI') as etiqueta,
               sum(y.monto)::float8 as total, count(*)::int as cantidad
        ${base(q, f)} group by y.turno_id order by min(t.abierto_at)`
    : por === "dia"
    ? q`select to_char(x.l, 'YYYY-MM-DD') as clave, to_char(x.l, 'YYYY-MM-DD') as etiqueta,
               sum(y.monto)::float8 as total, count(*)::int as cantidad
        ${base(q, f)} group by to_char(x.l, 'YYYY-MM-DD') order by 1`
    : q`select to_char(x.l, 'YYYY-MM') as clave, to_char(x.l, 'YYYY-MM') as etiqueta,
               sum(y.monto)::float8 as total, count(*)::int as cantidad
        ${base(q, f)} group by to_char(x.l, 'YYYY-MM') order by 1`;

export const filas = (q: Q, f: FiltroYapes, limite: number) =>
  q`select y.id, to_char(x.l, 'YYYY-MM-DD HH24:MI:SS') as fecha_lima, y.monto::float8 as monto, y.emisor, y.receptor,
           y.verificacion, y.comentario, y.turno_id
    ${base(q, f)} order by y.fecha desc, y.id desc limit ${limite + 1}`;
