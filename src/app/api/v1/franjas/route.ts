import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { filtrosFranjas, franjaNueva } from "@/shared/caja";
import * as s from "@/server/services/franjas";

// vigente=true devuelve solo las franjas activas que contienen la hora actual de Lima.
export const GET = api(async (req: Request) => {
  await requireUser();
  const f = filtrosFranjas.parse(Object.fromEntries(new URL(req.url).searchParams));
  return s.listar(f.vigente === "true");
});
export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.crear(uid, franjaNueva.parse(await req.json()));
}, 201);
