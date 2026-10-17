import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { filtrosReporteYapes } from "@/shared/caja";
import * as s from "@/server/services/reportes";

// formato=json (por defecto) devuelve datos; formato=csv descarga el archivo.
export const GET = api(async (req: Request) => {
  await requireUser();
  const f = filtrosReporteYapes.parse(Object.fromEntries(new URL(req.url).searchParams));
  return f.formato === "csv" ? s.yapesCsv(f) : s.yapes(f);
});
