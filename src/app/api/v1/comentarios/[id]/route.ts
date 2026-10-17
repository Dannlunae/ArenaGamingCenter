import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { comentarioCambio } from "@/shared/caja";
import * as s from "@/server/services/comentarios";

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cambiar(uid, await idDe(ctx), comentarioCambio.parse(await req.json()));
});
export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.eliminar(uid, await idDe(ctx));
});
