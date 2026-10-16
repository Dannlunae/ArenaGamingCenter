import { z } from "zod";

export const ESTADOS_PC = ["libre", "en_uso", "error", "mantenimiento"] as const;
export const ESTADOS_SW = ["sin_revisar", "pendiente", "actualizando", "al_dia", "error"] as const;
export type EstadoPc = (typeof ESTADOS_PC)[number];
export type EstadoSw = (typeof ESTADOS_SW)[number];

const texto = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const ids = z.array(z.number().int().positive()).min(1).max(100);

// PCs
export const pcNueva = z.object({ nombre: z.string().trim().min(1).max(40), ubicacion: texto(80), orden: z.number().int().optional() });
export const pcCambio = pcNueva.partial();
export const estadoPc = z.object({ estado: z.enum(ESTADOS_PC), motivo: texto(200) });
export const estadoPcMasivo = estadoPc.extend({ ids });
export const filtrosPcs = z.object({
  estado: z.enum(ESTADOS_PC).optional(),
  q: z.string().trim().max(40).optional(),
  softwareId: z.coerce.number().int().positive().optional(),
  softwareEstado: z.enum(ESTADOS_SW).optional(),
  conNotas: z.enum(["true", "false"]).optional(),
});

// Software
export const softwareNuevo = z.object({ nombre: z.string().trim().min(1).max(60), tipo: z.enum(["driver", "juego", "otro"]).default("juego") });
export const softwareCambio = z.object({
  nombre: z.string().trim().min(1).max(60), tipo: z.enum(["driver", "juego", "otro"]),
  activo: z.boolean(), orden: z.number().int(),
}).partial();
export const marcarSoftware = z.object({ estado: z.enum(ESTADOS_SW), version: texto(60), nota: texto(200) });
export const marcarMasivo = marcarSoftware.extend({ pcIds: ids });

// Notas
export const notaNueva = z.object({ comentario: z.string().trim().min(1).max(500), fecha: z.string().datetime({ offset: true }).optional() });
export const notaCambio = notaNueva.partial().extend({ resuelta: z.boolean().optional() });
export const filtrosNotas = z.object({
  pcId: z.coerce.number().int().positive().optional(),
  abiertas: z.enum(["true", "false"]).optional(),
});
