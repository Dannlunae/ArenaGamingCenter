import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { comentarioNuevo, filtrosComentarios } from "@/shared/caja";
import * as s from "@/server/services/comentarios";

export const GET = api(async (req: Request) => {
  await requireUser();
  return s.listar(filtrosComentarios.parse(Object.fromEntries(new URL(req.url).searchParams)));
});
export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.crear(uid, comentarioNuevo.parse(await req.json()));
}, 201);
