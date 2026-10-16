import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type { z } from "zod";
import type { softwareNuevo, softwareCambio, marcarSoftware, marcarMasivo } from "@/shared/pcs";
import * as repo from "../repos/software";
import * as pcs from "../repos/pcs";

const duplicado = (e: unknown) => (e as { code?: string }).code === "23505";

export const listar = () => repo.listar(sql);

export const crear = (uid: string, input: z.infer<typeof softwareNuevo>) => conUsuario(uid, async (q) => {
  try { return await repo.crear(q, input); }
  catch (e) { if (duplicado(e)) throw new HttpError(409, "Ya existe ese software"); throw e; }
});

export const cambiar = (uid: string, id: number, input: z.infer<typeof softwareCambio>) => conUsuario(uid, async (q) => {
  try {
    const r = await repo.actualizar(q, id, input);
    if (!r) throw new HttpError(404, "Software no encontrado");
    return r;
  } catch (e) { if (duplicado(e)) throw new HttpError(409, "Ya existe ese software"); throw e; }
});

const PUEDEN_ACTUALIZAR = ["libre", "mantenimiento"];

/** Marca un software en varias PC. Las que no cumplen las reglas se omiten con su motivo. */
async function marcar(uid: string, softwareId: number, pcIds: number[], input: z.infer<typeof marcarSoftware>) {
  return conUsuario(uid, async (q) => {
    const sw = await repo.porId(q, softwareId);
    if (!sw) throw new HttpError(404, "Software no encontrado");
    if (!sw.activo) throw new HttpError(409, "Ese software está desactivado");
    const estados = new Map((await pcs.estados(q, pcIds)).map((p) => [Number(p.id), p.estado as string]));
    const ok: number[] = [];
    const omitidas: { pcId: number; motivo: string; codigo: number }[] = [];
    for (const id of new Set(pcIds)) {
      const e = estados.get(id);
      if (!e) omitidas.push({ pcId: id, motivo: "No existe", codigo: 404 });
      else if (input.estado === "actualizando" && !PUEDEN_ACTUALIZAR.includes(e))
        omitidas.push({ pcId: id, motivo: `Solo se puede actualizar con la PC libre o en mantenimiento (está "${e}")`, codigo: 409 });
      else ok.push(id);
    }
    if (ok.length) await repo.marcar(q, softwareId, ok, input);
    return { actualizadas: ok.length, omitidas };
  });
}

export const marcarVarias = (uid: string, softwareId: number, input: z.infer<typeof marcarMasivo>) =>
  marcar(uid, softwareId, input.pcIds, input);

export async function marcarUna(uid: string, pcId: number, softwareId: number, input: z.infer<typeof marcarSoftware>) {
  const r = await marcar(uid, softwareId, [pcId], input);
  const o = r.omitidas[0];
  if (o) throw new HttpError(o.codigo, o.motivo);
  return { ok: true };
}
