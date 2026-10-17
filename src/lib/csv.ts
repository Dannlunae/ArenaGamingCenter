// CSV para Excel: UTF-8 con BOM y protección contra fórmulas (=, +, -, @) en textos.
const esc = (v: unknown) => {
  if (v === null || v === undefined) return "";
  let s = typeof v === "boolean" ? (v ? "sí" : "no") : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function aCsv(cols: { clave: string; titulo: string }[], filas: Record<string, unknown>[]) {
  const cab = cols.map((c) => esc(c.titulo)).join(",");
  const cuerpo = filas.map((f) => cols.map((c) => esc(f[c.clave])).join(",")).join("\r\n");
  return "\uFEFF" + cab + "\r\n" + cuerpo + (cuerpo ? "\r\n" : "");
}
