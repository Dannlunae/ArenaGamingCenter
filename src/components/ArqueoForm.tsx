"use client";
import { useState } from "react";
import { DENOMS } from "@/shared/schemas";

type Det = { denominacion: number; cantidad: number }[];
const m = (n: number) => "S/ " + n.toFixed(2);

export function ArqueoForm({ titulo, boton, pedirSistema, onEnviar, onCancelar }: {
  titulo: string; boton: string; pedirSistema: boolean;
  onEnviar: (d: Det, sistema?: number) => Promise<void>; onCancelar: () => void;
}) {
  const [c, setC] = useState<Record<number, number>>({});
  const [sis, setSis] = useState(""); const [err, setErr] = useState(""); const [ocupado, setOcupado] = useState(false);
  const set = (d: number, v: number) => setC({ ...c, [d]: Math.max(0, Math.floor(v) || 0) });
  const total = Math.round(DENOMS.reduce((a, d) => a + d * (c[d] || 0), 0) * 100) / 100;
  const dif = sis !== "" ? Math.round((total - parseFloat(sis)) * 100) / 100 : null;

  async function enviar() {
    if (pedirSistema && sis === "") return setErr("Escribe el efectivo del sistema");
    setOcupado(true); setErr("");
    try { await onEnviar(DENOMS.map((d) => ({ denominacion: d, cantidad: c[d] || 0 })), sis === "" ? undefined : parseFloat(sis)); }
    catch (e) { setErr((e as Error).message); setOcupado(false); }
  }
  return (
    <div className="sh"><div className="box">
      <h3>{titulo}</h3>
      {DENOMS.map((d) => (
        <div className="den" key={d}>
          <b>{d >= 10 ? "S/ " + d : d >= 1 ? "S/ " + d : "S/ " + d.toFixed(2)}</b>
          <div className="st"><button className="x" onClick={() => set(d, (c[d] || 0) - 1)}>−</button>
            <input inputMode="numeric" value={c[d] || ""} placeholder="0" onChange={(e) => set(d, +e.target.value)} />
            <button className="x" onClick={() => set(d, (c[d] || 0) + 1)}>+</button></div>
          <span className="mu" style={{ textAlign: "right" }}>{m(d * (c[d] || 0))}</span>
        </div>
      ))}
      <div className="row"><b>Total contado</b><b>{m(total)}</b></div>
      {pedirSistema && <>
        <p className="mu">Efectivo según el sistema del negocio</p>
        <input inputMode="decimal" placeholder="S/ 0.00" value={sis} onChange={(e) => setSis(e.target.value)} />
        {dif !== null && <p className={dif === 0 ? "ok" : "bad"}><b>Diferencia: {m(dif)}</b> {dif === 0 ? "✓ cuadra" : dif > 0 ? "(sobra)" : "(falta)"}</p>}
      </>}
      {err && <p className="bad">{err}</p>}
      <div className="g" style={{ marginTop: 10 }}>
        <button onClick={onCancelar}>Cancelar</button>
        <button className="p" disabled={ocupado} onClick={enviar}>{boton}</button>
      </div>
    </div></div>
  );
}
