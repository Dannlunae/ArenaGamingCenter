import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { yapeCambio } from "@/shared/schemas";
import * as s from "@/server/services/yapes";

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cambiar(uid, await idDe(ctx), yapeCambio.parse(await req.json()));
});
export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.eliminar(uid, await idDe(ctx));
});
