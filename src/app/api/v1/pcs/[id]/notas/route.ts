import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { notaNueva } from "@/shared/pcs";
import * as s from "@/server/services/notas";

export const GET = api(async (req: Request, ctx: Ctx) => {
  await requireUser();
  const abiertas = new URL(req.url).searchParams.get("abiertas") ?? undefined;
  return s.listar({ pcId: await idDe(ctx), abiertas: abiertas as "true" | "false" | undefined });
});
export const POST = api(async (req: Request, ctx: Ctx) => {
  const uid = await requireUser();
  return s.crear(uid, await idDe(ctx), notaNueva.parse(await req.json()));
}, 201);
