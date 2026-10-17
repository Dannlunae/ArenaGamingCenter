import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { restaurar } from "@/shared/caja";
import * as s from "@/server/services/papelera";

export const POST = api(async (req: Request) => {
  const uid = await requireUser();
  return s.restaurar(uid, restaurar.parse(await req.json()));
});
