import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { softwareCambio } from "@/shared/pcs";
import * as s from "@/server/services/software";

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cambiar(uid, await idDe(ctx), softwareCambio.parse(await req.json()));
});
