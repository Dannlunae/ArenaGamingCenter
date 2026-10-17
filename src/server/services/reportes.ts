import { sql } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { ahoraLima, resolverRango } from "@/lib/tiempo";
import { aCsv } from "@/lib/csv";
import type { z } from "zod";
import type { filtrosReporteYapes } from "@/shared/caja";
import * as repo from "../repos/reportes";
import * as franjas from "./franjas";

type Filtros = z.infer<typeof filtrosReporteYapes>;
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function yapes(f: Filtros) {
  const hoy = ahoraLima().fecha;
  let { desde, hasta } = f;
  if (f.rango) ({ desde, hasta } = resolverRango(f.rango, hoy));
  else if (!desde && !hasta && !f.turnoId) ({ desde, hasta } = resolverRango("hoy", hoy));
  else if (desde && !hasta) hasta = hoy;
  else if (!desde && hasta) desde = hasta;

  let franja: repo.FiltroYapes["franja"];
  let franjaNombre: string | undefined;
  if (f.franjaId) {
    const fr = await franjas.porId(sql, f.franjaId);
    if (!fr) throw new HttpError(404, "Franja no encontrada");
    franja = { hi: fr.hora_inicio, hf: fr.hora_fin, dias: fr.dias_semana };
    franjaNombre = fr.nombre;
  } else if (f.horaDesde && f.horaHasta) {
    if (f.horaDesde === f.horaHasta) throw new HttpError(400, "horaDesde y horaHasta no pueden ser iguales");
    franja = { hi: f.horaDesde, hf: f.horaHasta, dias: null };
  }

  const filtro: repo.FiltroYapes = { desde, hasta, turnoId: f.turnoId, franja, verificacion: f.verificacion, emisor: f.emisor };
  const t = await repo.totales(sql, filtro);
  const out: Record<string, unknown> = {
    filtros: { desde: desde ?? null, hasta: hasta ?? null, turnoId: f.turnoId ?? null, franja: franjaNombre ?? (franja ? `${franja.hi}-${franja.hf}` : null), verificacion: f.verificacion ?? null, emisor: f.emisor ?? null },
    total: r2(t.total), cantidad: t.cantidad, promedio: t.cantidad ? r2(t.total / t.cantidad) : 0,
  };
  if (f.agrupar === "ninguno") {
    const filas = await repo.filas(sql, filtro, f.limite);
    out.truncado = filas.length > f.limite;
    out.yapes = filas.slice(0, f.limite);
  } else {
    out.grupos = await repo.agrupado(sql, filtro, f.agrupar);
  }
  return out;
}

/** Misma consulta, pero como archivo CSV listo para Excel. */
export async function yapesCsv(f: Filtros) {
  const r = await yapes(f);
  const fl = r.filtros as { desde: string | null; hasta: string | null };
  const nombre = `yapes_${fl.desde ?? "turno"}${fl.hasta && fl.hasta !== fl.desde ? "_" + fl.hasta : ""}${f.agrupar !== "ninguno" ? "_por-" + f.agrupar : ""}.csv`;
  const texto = f.agrupar === "ninguno"
    ? aCsv([
        { clave: "id", titulo: "ID" }, { clave: "fecha_lima", titulo: "Fecha (Lima)" }, { clave: "emisor", titulo: "Emisor" },
        { clave: "receptor", titulo: "Receptor" }, { clave: "monto", titulo: "Monto" }, { clave: "verificacion", titulo: "Verificado" },
        { clave: "comentario", titulo: "Comentario" }, { clave: "turno_id", titulo: "Turno" },
      ], r.yapes as Record<string, unknown>[])
    : aCsv([{ clave: "etiqueta", titulo: f.agrupar === "turno" ? "Turno (apertura)" : f.agrupar === "dia" ? "Día" : "Mes" }, { clave: "total", titulo: "Total" }, { clave: "cantidad", titulo: "Cantidad" }],
        [...(r.grupos as Record<string, unknown>[]), { etiqueta: "TOTAL", total: r.total, cantidad: r.cantidad }]);
  return new Response(texto, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nombre}"` } });
}
