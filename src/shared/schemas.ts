import { z } from "zod";

export const DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1] as const;

export const detalle = z.array(z.object({
  denominacion: z.number().refine((d) => (DENOMS as readonly number[]).includes(d), "Denominación inválida"),
  cantidad: z.number().int().min(0).max(100000),
})).refine((d) => new Set(d.map((x) => x.denominacion)).size === d.length, "Denominación repetida");
export type Detalle = z.infer<typeof detalle>;

const texto = z.string().trim().max(200).nullish().transform((v) => (v ? v : null));

export const yapeNuevo = z.object({
  monto: z.number().positive().max(100000),
  emisor: texto, receptor: texto, comentario: texto,
});
export const yapeCambio = z.object({
  monto: z.number().positive().max(100000),
  emisor: texto, receptor: texto, comentario: texto,
  verificacion: z.boolean().nullable(),
  fecha: z.string().datetime({ offset: true }),
}).partial();
export const ordenYapes = z.object({ ids: z.array(z.number().int()).min(1) });

export const abrirTurno = z.object({ franjaId: z.number().int().nullish(), detalle });
// Al cuadrar: efectivo contado + (opcional) marcar yapes como verificados/falsos + comparar con el sistema.
// Hay que dar al menos uno de los dos números del sistema.
const verificaciones = z.array(z.object({ yapeId: z.number().int().positive(), verificacion: z.boolean().nullable() })).max(500).optional();
const cuadreBase = z.object({
  detalle,
  sistemaEfectivo: z.number().min(0).nullish(),   // efectivo según el sistema
  sistemaTotal: z.number().min(0).nullish(),      // ventas totales según el sistema (efectivo + yape)
  verificaciones,
});
const unSistema = (x: { sistemaEfectivo?: number | null; sistemaTotal?: number | null }) => x.sistemaEfectivo != null || x.sistemaTotal != null;
const msgSistema = "Indica sistemaEfectivo o sistemaTotal (o ambos)";
export const arqueoNuevo = cuadreBase.extend({ tipo: z.literal("media_hora").default("media_hora") }).refine(unSistema, msgSistema);
export const cerrarTurno = cuadreBase.refine(unSistema, msgSistema);
