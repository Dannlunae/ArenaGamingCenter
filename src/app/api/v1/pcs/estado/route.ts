import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { estadoPcMasivo } from "@/shared/pcs";
import * as s from "@/server/services/pcs";

// Cambia el estado de varias PC a la vez (omite las que no cumplan las reglas).
export const PATCH = api(async (req: Request) => {
  const uid = await requireUser();
  return s.cambiarEstadoMasivo(uid, estadoPcMasivo.parse(await req.json()));
});
