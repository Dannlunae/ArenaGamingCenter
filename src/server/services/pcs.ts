import { sql, conUsuario } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import type postgres from "postgres";
import type { z } from "zod";
import type { EstadoPc, pcNueva, pcCambio, estadoPc, estadoPcMasivo, filtrosPcs } from "@/shared/pcs";
import * as repo from "../repos/pcs";
import * as notas from "../repos/notas";

type Q = postgres.Sql;
const duplicado = (e: unknown) => (e as { code?: string }).code === "23505";

// Reglas de transición del estado de una PC
const TRANSICIONES: Record<EstadoPc, EstadoPc[]> = {
  libre: ["en_uso", "error", "mantenimiento"],
  en_uso: ["libre", "error", "mantenimiento"],
  error: ["libre", "mantenimiento"],
  mantenimiento: ["libre", "error"],
};
const requiereMotivo = (e: EstadoPc) => e === "error" || e === "mantenimiento";

/** null = permitido; texto = razón del rechazo. */
function validar(actual: EstadoPc, nuevo: EstadoPc, motivo: string | null, enCurso: number): string | null {
  if (!TRANSICIONES[actual].includes(nuevo)) return `No puede pasar de "${actual}" a "${nuevo}": primero déjala en "libre"`;
  if (requiereMotivo(nuevo) && !motivo) return "Indica el motivo";
  if (nuevo === "en_uso" && enCurso > 0) return "Tiene actualizaciones en curso";
  return null;
}

async function aplicarEstado(q: Q, ids: number[], estado: EstadoPc, motivo: string | null) {
  const pcs = await repo.bloquear(q, ids);
  const curso = await repo.enCurso(q, ids);
  const existentes = new Set(pcs.map((p) => Number(p.id)));
  const ok: number[] = [];
  const omitidas: { pcId: number; motivo: string; codigo: number }[] = [];
  for (const id of new Set(ids)) if (!existentes.has(id)) omitidas.push({ pcId: id, motivo: "No existe", codigo: 404 });
  for (const p of pcs) {
    const id = Number(p.id);
    if (p.estado === estado) {
      if (requiereMotivo(estado) && motivo && motivo !== p.motivo) ok.push(id);   // solo corrige el motivo
      else omitidas.push({ pcId: id, motivo: "Ya estaba en ese estado", codigo: 200 });
      continue;
    }
    const err = validar(p.estado, estado, motivo, curso.get(id) ?? 0);
    if (err) omitidas.push({ pcId: id, motivo: err, codigo: 409 }); else ok.push(id);
  }
  if (ok.length) await repo.fijarEstado(q, ok, estado, requiereMotivo(estado) ? motivo : null);
  return { actualizadas: ok.length, omitidas };
}

// ── consultas ──
export const listar = (f: z.infer<typeof filtrosPcs>) => repo.listar(sql, f);

export async function detalle(id: number) {
  const pc = await repo.porId(sql, id);
  if (!pc) throw new HttpError(404, "PC no encontrada");
  return { ...pc, software: await repo.softwareDe(sql, id), notas: await notas.listar(sql, { pcId: id }) };
}

export async function resumen() {
  const r = await repo.resumen(sql);
  const base = { libre: 0, en_uso: 0, error: 0, mantenimiento: 0 } as Record<string, number>;
  let total = 0;
  for (const x of r.porEstado) { base[x.estado] = Number(x.n); total += Number(x.n); }
  const sw = new Map<number, { softwareId: number; nombre: string; porEstado: Record<string, number> }>();
  for (const x of r.sw) {
    const k = Number(x.id);
    if (!sw.has(k)) sw.set(k, { softwareId: k, nombre: x.nombre, porEstado: { sin_revisar: 0, pendiente: 0, actualizando: 0, al_dia: 0, error: 0 } });
    sw.get(k)!.porEstado[x.estado] = Number(x.n);
  }
  return { total, porEstado: base, software: [...sw.values()], pcsConNotasAbiertas: r.pcsConNotasAbiertas };
}

export const historial = async (id: number) => {
  if (!(await repo.porId(sql, id))) throw new HttpError(404, "PC no encontrada");
  return repo.historial(sql, id);
};

// ── cambios ──
export const crear = (uid: string, input: z.infer<typeof pcNueva>) => conUsuario(uid, async (q) => {
  try { return await repo.crear(q, { nombre: input.nombre, ubicacion: input.ubicacion ?? null, orden: input.orden }); }
  catch (e) { if (duplicado(e)) throw new HttpError(409, "Ya existe una PC con ese nombre"); throw e; }
});

export const cambiar = (uid: string, id: number, input: z.infer<typeof pcCambio>) => conUsuario(uid, async (q) => {
  try {
    const r = await repo.actualizar(q, id, input);
    if (!r) throw new HttpError(404, "PC no encontrada");
    return r;
  } catch (e) { if (duplicado(e)) throw new HttpError(409, "Ya existe una PC con ese nombre"); throw e; }
});

export const eliminar = (uid: string, id: number) => conUsuario(uid, async (q) => {
  const [pc] = await repo.bloquear(q, [id]);
  if (!pc) throw new HttpError(404, "PC no encontrada");
  if (pc.estado === "en_uso") throw new HttpError(409, "No se puede eliminar una PC en uso");
  await repo.aPapelera(q, id);
  return { ok: true };
});

export const cambiarEstado = (uid: string, id: number, input: z.infer<typeof estadoPc>) => conUsuario(uid, async (q) => {
  const r = await aplicarEstado(q, [id], input.estado, input.motivo ?? null);
  const o = r.omitidas[0];
  if (o && o.codigo !== 200) throw new HttpError(o.codigo, o.motivo);
  return { ...(await repo.porId(q, id)), cambio: r.actualizadas > 0 };
});

export const cambiarEstadoMasivo = (uid: string, input: z.infer<typeof estadoPcMasivo>) =>
  conUsuario(uid, (q) => aplicarEstado(q, input.ids, input.estado, input.motivo ?? null));
