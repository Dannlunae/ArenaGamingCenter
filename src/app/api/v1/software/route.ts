import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { softwareNuevo } from "@/shared/pcs";
import * as s from "@/server/services/software";

export const GET = api(async () => { await requireUser(); return s.listar(); });
export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.crear(uid, softwareNuevo.parse(await req.json()));
}, 201);
