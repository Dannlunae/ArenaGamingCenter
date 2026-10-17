import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import * as s from "@/server/services/turnos";

export const POST = api(async (_req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.reabrir(uid, await idDe(ctx));
});
