import { api, idDe, type Ctx } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import * as s from "@/server/services/pcs";

export const GET = api(async (_req: Request, ctx: Ctx) => { await requireUser(); return s.historial(await idDe(ctx)); });
