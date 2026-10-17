import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { filtrosTurnos } from "@/shared/caja";
import * as s from "@/server/services/turnos";

export const GET = api(async (req: Request) => {
  await requireUser();
  return s.listar(filtrosTurnos.parse(Object.fromEntries(new URL(req.url).searchParams)));
});
