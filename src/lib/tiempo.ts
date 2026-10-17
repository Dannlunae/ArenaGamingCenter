// Todo el negocio trabaja en hora de Lima (UTC−5, sin horario de verano).
export const TZ = "America/Lima";
const ISO: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function ahoraLima(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour === "24" ? "00" : p.hour}:${p.minute}`, isodow: ISO[p.weekday] };
}

export const sumarDias = (fecha: string, n: number) => {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function resolverRango(rango: string, hoy = ahoraLima().fecha): { desde: string; hasta: string } {
  switch (rango) {
    case "hoy": return { desde: hoy, hasta: hoy };
    case "ayer": { const a = sumarDias(hoy, -1); return { desde: a, hasta: a }; }
    case "7d": return { desde: sumarDias(hoy, -6), hasta: hoy };
    case "30d": return { desde: sumarDias(hoy, -29), hasta: hoy };
    case "semana": { const dow = new Date(hoy + "T00:00:00Z").getUTCDay() || 7; return { desde: sumarDias(hoy, -(dow - 1)), hasta: hoy }; }
    case "mes": return { desde: hoy.slice(0, 8) + "01", hasta: hoy };
    case "mes_anterior": {
      const primero = hoy.slice(0, 8) + "01";
      const hasta = sumarDias(primero, -1);
      return { desde: hasta.slice(0, 8) + "01", hasta };
    }
  }
  throw new Error("rango inválido");
}

type Franja = { hora_inicio: string; hora_fin: string; dias_semana: number[] };
/** ¿La hora de Lima dada cae dentro de la franja? Soporta franjas que cruzan la medianoche. */
export function dentroDeFranja(f: Franja, a = ahoraLima()) {
  const hi = f.hora_inicio.slice(0, 5), hf = f.hora_fin.slice(0, 5), t = a.hora;
  const cruza = hi > hf;
  if (!(cruza ? t >= hi || t < hf : t >= hi && t < hf)) return false;
  const dia = cruza && t < hf ? (a.isodow === 1 ? 7 : a.isodow - 1) : a.isodow;   // la madrugada cuenta para el día en que empezó
  return f.dias_semana.includes(dia);
}
