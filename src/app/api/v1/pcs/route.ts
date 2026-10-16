import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { filtrosPcs, pcNueva } from "@/shared/pcs";
import * as s from "@/server/services/pcs";

export const GET = api(async (req: Request) => {
  await requireUser();
  return s.listar(filtrosPcs.parse(Object.fromEntries(new URL(req.url).searchParams)));
});
export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.crear(uid, pcNueva.parse(await req.json()));
}, 201);
