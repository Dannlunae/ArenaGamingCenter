import { z } from "zod";
import { detalle } from "./schemas";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa AAAA-MM-DD");
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:MM");
const id = z.coerce.number().int().positive();
const bool = z.enum(["true", "false"]);

// ── Reportes de yapes ──
export const RANGOS = ["hoy", "ayer", "7d", "30d", "semana", "mes", "mes_anterior"] as const;
export const filtrosReporteYapes = z.object({
  rango: z.enum(RANGOS).optional(), desde: fecha.optional(), hasta: fecha.optional(),
  turnoId: id.optional(), franjaId: id.optional(),
  horaDesde: hora.optional(), horaHasta: hora.optional(),
  agrupar: z.enum(["ninguno", "turno", "dia", "mes"]).default("ninguno"),
  verificacion: z.enum(["verificado", "falso", "sin_revisar"]).optional(),
  emisor: z.string().trim().max(80).optional(),
  formato: z.enum(["json", "csv"]).default("json"),
  limite: z.coerce.number().int().min(1).max(5000).default(1000),
})
  .refine((f) => (f.horaDesde === undefined) === (f.horaHasta === undefined), "horaDesde y horaHasta van juntas")
  .refine((f) => !(f.franjaId && f.horaDesde), "Usa franjaId o horaDesde/horaHasta, no ambos")
  .refine((f) => !f.rango || (!f.desde && !f.hasta), "Usa rango o desde/hasta, no ambos")
  .refine((f) => !(f.desde && f.hasta) || f.desde <= f.hasta, "desde no puede ser mayor que hasta");

// ── Turnos ──
export const filtrosTurnos = z.object({
  desde: fecha.optional(), hasta: fecha.optional(),
  estado: z.enum(["abierto", "cerrado"]).optional(),
  limite: z.coerce.number().int().min(1).max(500).default(50),
});
export const turnoCambio = z.object({
  franjaId: z.number().int().positive().nullable(),
  abiertoAt: z.string().datetime({ offset: true }),
  cerradoAt: z.string().datetime({ offset: true }),
}).partial();
export const arqueoCambio = z.object({
  detalle: detalle.optional(),
  sistemaEfectivo: z.number().min(0).nullable().optional(),
  sistemaTotal: z.number().min(0).nullable().optional(),
}).refine((x) => x.detalle !== undefined || x.sistemaEfectivo !== undefined || x.sistemaTotal !== undefined, "Nada que cambiar");

// ── Franjas ──
const franjaBase = z.object({
  nombre: z.string().trim().min(1).max(40),
  horaInicio: hora, horaFin: hora,
  diasSemana: z.array(z.number().int().min(1).max(7)).min(1).max(7).transform((a) => [...new Set(a)].sort()),
  activo: z.boolean(), orden: z.number().int(),
});
export const franjaNueva = franjaBase.partial({ diasSemana: true, activo: true, orden: true });
export const franjaCambio = franjaBase.partial();
export const filtrosFranjas = z.object({ vigente: bool.optional() });

// ── Comentarios rápidos ──
export const comentarioNuevo = z.object({
  texto: z.string().trim().min(1).max(500),
  turnoId: z.number().int().positive().nullish(),
  fijado: z.boolean().optional(),
});
export const comentarioCambio = z.object({ texto: z.string().trim().min(1).max(500), fijado: z.boolean(), hecho: z.boolean() }).partial();
export const filtrosComentarios = z.object({
  turnoId: id.optional(), alcance: z.enum(["turno", "todos"]).default("turno"), pendientes: bool.optional(),
});

// ── Papelera ──
export const TIPOS_PAPELERA = ["yapes", "comentarios", "turnos", "arqueos", "pcs", "notas"] as const;
export const filtrosPapelera = z.object({ tipo: z.enum(TIPOS_PAPELERA).optional() });
export const restaurar = z.object({ tipo: z.enum(TIPOS_PAPELERA), id: z.number().int().positive() });
export const purgar = z.object({ dias: z.coerce.number().int().min(0).max(3650).default(30) });
