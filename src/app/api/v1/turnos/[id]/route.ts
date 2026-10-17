import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { turnoCambio } from "@/shared/caja";
import * as s from "@/server/services/turnos";

export const GET = api(async (_req: Request, ctx: Ctx) => { await requireUser(); return s.detalle(await idDe(ctx)); });
export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cambiar(uid, await idDe(ctx), turnoCambio.parse(await req.json()));
});
export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.eliminar(uid, await idDe(ctx));
});
