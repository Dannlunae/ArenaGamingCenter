import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { cerrarTurno } from "@/shared/schemas";
import * as s from "@/server/services/turnos";

export const POST = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.cerrar(uid, await idDe(ctx), cerrarTurno.parse(await req.json()));
});
