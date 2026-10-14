import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { abrirTurno } from "@/shared/schemas";
import * as s from "@/server/services/turnos";

export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.abrir(uid, abrirTurno.parse(await req.json()));
}, 201);
