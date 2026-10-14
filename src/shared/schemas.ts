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
export const arqueoNuevo = z.object({ tipo: z.literal("media_hora").default("media_hora"), detalle, sistemaEfectivo: z.number().min(0) });
export const cerrarTurno = z.object({ detalle, sistemaEfectivo: z.number().min(0) });
