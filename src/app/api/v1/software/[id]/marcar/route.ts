import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { marcarMasivo } from "@/shared/pcs";
import * as s from "@/server/services/software";

// Marca un software en varias PC a la vez (omite las que no cumplan las reglas).
export const POST = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.marcarVarias(uid, await idDe(ctx), marcarMasivo.parse(await req.json()));
});
