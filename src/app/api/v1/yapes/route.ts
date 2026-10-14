import { z } from "zod";
import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { yapeNuevo } from "@/shared/schemas";
import * as s from "@/server/services/yapes";

export const GET = api(async (req: Request) => {
  await requireUser();
  const turnoId = z.coerce.number().int().positive().parse(new URL(req.url).searchParams.get("turnoId"));
  return s.listar(turnoId);
});
export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.crear(uid, yapeNuevo.parse(await req.json()));
}, 201);
