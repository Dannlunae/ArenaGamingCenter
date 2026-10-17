import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { arqueoCambio } from "@/shared/caja";
import * as s from "@/server/services/turnos";

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cambiarArqueo(uid, await idDe(ctx), arqueoCambio.parse(await req.json()));
});
export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.eliminarArqueo(uid, await idDe(ctx));
});
