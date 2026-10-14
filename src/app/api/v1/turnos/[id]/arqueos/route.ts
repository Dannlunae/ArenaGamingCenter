import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { arqueoNuevo } from "@/shared/schemas";
import * as s from "@/server/services/turnos";

export const POST = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cuadrar(uid, await idDe(ctx), arqueoNuevo.parse(await req.json()));
}, 201);
