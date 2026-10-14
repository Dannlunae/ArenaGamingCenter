import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { ordenYapes } from "@/shared/schemas";
import * as s from "@/server/services/yapes";

export const PATCH = api(async (req: Request) => {
  const uid = await requireUser();
  return s.reordenar(uid, ordenYapes.parse(await req.json()));
});
