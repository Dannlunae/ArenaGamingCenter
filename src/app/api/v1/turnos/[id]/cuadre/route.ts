import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import * as s from "@/server/services/turnos";

// Vista previa para cuadrar: yapes del turno hasta ahora (monto y hora), tramo desde el último cuadre y totales.
export const GET = api(async (_req: Request, ctx: Ctx) => { await requireUser(); return s.cuadrePrevio(await idDe(ctx)); });
