import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import * as s from "@/server/services/pcs";

export const GET = api(async () => { await requireUser(); return s.resumen(); });
