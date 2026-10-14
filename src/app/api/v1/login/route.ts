import { z } from "zod";
import { api } from "@/lib/http";
import { iniciarSesion, cerrarSesion } from "@/lib/auth";

export const POST = api(async (req: Request) => {
  const { password } = z.object({ password: z.string() }).parse(await req.json());
  await iniciarSesion(password);
  return { ok: true };
});
export const DELETE = api(async () => { await cerrarSesion(); return { ok: true }; });
