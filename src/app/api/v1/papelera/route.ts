import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { filtrosPapelera, purgar } from "@/shared/caja";
import * as s from "@/server/services/papelera";

// Sin `tipo`: cuántos elementos hay por tipo. Con `tipo`: la lista.
export const GET = api(async (req: Request) => {
  await requireUser();
  return s.listar(filtrosPapelera.parse(Object.fromEntries(new URL(req.url).searchParams)));
});
// Borra definitivamente lo que lleva más de `dias` en la papelera (por defecto 30).
export const DELETE = api(async (req: Request) => {
  const uid = await requireUser();
  return s.purgar(uid, purgar.parse(Object.fromEntries(new URL(req.url).searchParams)));
});
