import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { estadoPc } from "@/shared/pcs";
import * as s from "@/server/services/pcs";

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cambiarEstado(uid, await idDe(ctx), estadoPc.parse(await req.json()));
});
