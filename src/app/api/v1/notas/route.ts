import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { filtrosNotas } from "@/shared/pcs";
import * as s from "@/server/services/notas";

// Todas las notas de todas las PC (filtrables por pcId y abiertas).
export const GET = api(async (req: Request) => {
  await requireUser();
  return s.listar(filtrosNotas.parse(Object.fromEntries(new URL(req.url).searchParams)));
});
