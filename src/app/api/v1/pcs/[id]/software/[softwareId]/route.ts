import { api, entero, type Ctx2 } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { marcarSoftware } from "@/shared/pcs";
import * as s from "@/server/services/software";

export const PATCH = api(async (req: Request, ctx: Ctx2) => {
  const uid = await requireUser();
  const p = await ctx.params;
  return s.marcarUna(uid, entero(p.id), entero(p.softwareId), marcarSoftware.parse(await req.json()));
});
