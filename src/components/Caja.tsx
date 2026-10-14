"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ArqueoForm } from "./ArqueoForm";

type Yape = { id: number; monto: number; fecha: string; emisor: string | null; receptor: string | null; comentario: string | null; verificacion: boolean | null };
type Estado = { turno: { id: number; abierto_at: string } | null; totalYapes: number; cantidadYapes: number; ultimoArqueoAt: string | null; intervaloCuadreMin: number };
type Det = { denominacion: number; cantidad: number }[];
type Modal = null | "abrir" | "cuadre" | "cerrar" | { yape: Yape };

const m = (n: number) => "S/ " + n.toFixed(2);
const hora = (s: string) => new Date(s).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
const PRESETS = [1, 2, 3, 5, 10];

export default function Caja() {
  const [est, setEst] = useState<Estado | null>(null);
  const [yapes, setYapes] = useState<Yape[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [aviso, setAviso] = useState(false);
  const [nota, setNota] = useState(""); const [err, setErr] = useState("");
  const [monto, setMonto] = useState(""); const [emisor, setEmisor] = useState("");

  const cargar = useCallback(async () => {
    try {
      const e = await api<Estado>("/api/v1/turnos/actual");
      setEst(e); setAviso(false);
      setYapes(e.turno ? await api<Yape[]>(`/api/v1/yapes?turnoId=${e.turno.id}`) : []);
    } catch (x) { setErr((x as Error).message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Aviso de cuadre: se calcula desde el último arqueo guardado (no se pierde al recargar).
  useEffect(() => {
    const chk = () => {
      if (!est?.turno) return;
      const ref = new Date(est.ultimoArqueoAt ?? est.turno.abierto_at).getTime();
      if (Date.now() - ref >= est.intervaloCuadreMin * 60000) setAviso(true);
    };
    chk();
    const t = setInterval(chk, 15000);
    document.addEventListener("visibilitychange", chk);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", chk); };
  }, [est]);

  async function guardar() {
    const v = parseFloat(monto.replace(",", "."));
    if (!(v > 0)) return setErr("Escribe un monto");
    try { await api("/api/v1/yapes", "POST", { monto: v, emisor: emisor || null }); setMonto(""); setEmisor(""); setErr(""); await cargar(); }
    catch (x) { setErr((x as Error).message); }
  }
  async function mover(i: number, d: -1 | 1) {
    const a = [...yapes]; const j = i + d; if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; setYapes(a);
    try { await api("/api/v1/yapes/orden", "PATCH", { ids: a.map((y) => y.id) }); } catch (x) { setErr((x as Error).message); cargar(); }
  }
  async function borrar(y: Yape) {
    if (!confirm(`¿Eliminar yape de ${m(y.monto)}? Va a la papelera.`)) return;
    try { await api(`/api/v1/yapes/${y.id}`, "DELETE"); await cargar(); } catch (x) { setErr((x as Error).message); }
  }
  async function abrir(detalle: Det) {
    const r = await api<{ totalContado: number; diferenciaConCierreAnterior: number | null }>("/api/v1/turnos/abrir", "POST", { detalle });
    setNota(`Turno abierto con ${m(r.totalContado)}.` + (r.diferenciaConCierreAnterior ? ` ⚠️ Difiere ${m(r.diferenciaConCierreAnterior)} del cierre anterior.` : ""));
    setModal(null); await cargar();
  }
  async function cuadre(detalle: Det, sistemaEfectivo?: number) {
    const r = await api<{ diferencia: number }>(`/api/v1/turnos/${est!.turno!.id}/arqueos`, "POST", { detalle, sistemaEfectivo });
    setNota(r.diferencia === 0 ? "Cuadre ✓ sin diferencia" : `Cuadre con diferencia de ${m(r.diferencia)}`); setModal(null); await cargar();
  }
  async function cerrar(detalle: Det, sistemaEfectivo?: number) {
    const r = await api<{ diferencia: number; yapes: { total: number; n: number } }>(`/api/v1/turnos/${est!.turno!.id}/cerrar`, "POST", { detalle, sistemaEfectivo });
    setNota(`Turno cerrado · Yapes ${m(r.yapes.total)} (${r.yapes.n}) · Diferencia ${m(r.diferencia)}`); setModal(null); await cargar();
  }
  async function salir() { await api("/api/v1/login", "DELETE"); location.href = "/login"; }

  if (!est) return <div className="w"><p className="mu">{err || "Cargando…"}</p></div>;
  return (
    <div className="w">
      <div className="row"><h2 style={{ margin: 0 }}>💜 Caja</h2><button className="x" onClick={salir}>Salir</button></div>
      {nota && <div className="nota" onClick={() => setNota("")}>{nota}</div>}
      {err && <div className="nota bad" onClick={() => setErr("")}>{err}</div>}

      <div className="card">
        {est.turno ? <>
          <div className="mu">Turno abierto desde las {hora(est.turno.abierto_at)}</div>
          <div className="big">{m(est.totalYapes)}</div>
          <div className="mu">{est.cantidadYapes} yapes</div>
          <div className="g" style={{ marginTop: 8 }}><button onClick={() => setModal("cuadre")}>Cuadre</button><button onClick={() => setModal("cerrar")}>Cerrar turno</button></div>
        </> : <>
          <div className="mu">No hay turno abierto</div>
          <p><button className="p" onClick={() => setModal("abrir")}>Abrir turno</button></p>
        </>}
      </div>

      {est.turno && <>
        <div className="card">
          <input inputMode="decimal" placeholder="Monto S/" value={monto} onChange={(e) => setMonto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardar()} />
          <div className="chips">{PRESETS.map((p) => <button key={p} onClick={() => setMonto(String(p))}>{p}</button>)}</div>
          <input placeholder="Nombre (opcional)" value={emisor} onChange={(e) => setEmisor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardar()} />
          <p><button className="p" style={{ width: "100%" }} onClick={guardar}>Guardar yape</button></p>
        </div>
        <div className="card">
          {!yapes.length && <p className="mu">Sin yapes todavía.</p>}
          {yapes.map((y, i) => (
            <div className="row" key={y.id}>
              <div><b>{y.emisor || "Sin nombre"}</b> {y.verificacion === true && <span className="ok">✓</span>}{y.verificacion === false && <span className="bad">✗</span>}
                <div className="mu">{hora(y.fecha)}{y.comentario ? " · " + y.comentario : ""}</div></div>
              <div className="st"><b>{m(y.monto)}</b>
                <button className="x" onClick={() => mover(i, -1)}>▲</button><button className="x" onClick={() => mover(i, 1)}>▼</button>
                <button className="x" onClick={() => setModal({ yape: y })}>✎</button><button className="x" onClick={() => borrar(y)}>🗑</button></div>
            </div>))}
        </div>
      </>}

      {aviso && modal === null && (
        <div className="sh"><div className="box"><h3>⏱ Hora de cuadrar la caja</h3>
          <p className="mu">Pasaron más de {est.intervaloCuadreMin} minutos desde el último conteo.</p>
          <div className="g"><button onClick={() => setAviso(false)}>Más tarde</button><button className="p" onClick={() => setModal("cuadre")}>Cuadrar ahora</button></div></div></div>)}
      {modal === "abrir" && <ArqueoForm titulo="Conteo inicial de caja" boton="Abrir turno" pedirSistema={false} onEnviar={abrir} onCancelar={() => setModal(null)} />}
      {modal === "cuadre" && <ArqueoForm titulo="Cuadre de caja" boton="Guardar cuadre" pedirSistema onEnviar={cuadre} onCancelar={() => setModal(null)} />}
      {modal === "cerrar" && <ArqueoForm titulo="Conteo final y cierre" boton="Cerrar turno" pedirSistema onEnviar={cerrar} onCancelar={() => setModal(null)} />}
      {modal && typeof modal === "object" && <EditarYape y={modal.yape} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await cargar(); }} />}
    </div>
  );
}

function EditarYape({ y, onClose, onSaved }: { y: Yape; onClose: () => void; onSaved: () => void }) {
  const lima = (s: string) => new Date(s).toLocaleString("sv-SE", { timeZone: "America/Lima" }).slice(0, 16).replace(" ", "T");
  const [f, setF] = useState({ monto: String(y.monto), emisor: y.emisor ?? "", receptor: y.receptor ?? "", comentario: y.comentario ?? "", verificacion: y.verificacion === null ? "" : String(y.verificacion), fecha: lima(y.fecha) });
  const [err, setErr] = useState("");
  const up = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function guardar() {
    try {
      await api(`/api/v1/yapes/${y.id}`, "PATCH", {
        monto: parseFloat(f.monto.replace(",", ".")), emisor: f.emisor || null, receptor: f.receptor || null, comentario: f.comentario || null,
        verificacion: f.verificacion === "" ? null : f.verificacion === "true",
        fecha: new Date(f.fecha + ":00-05:00").toISOString(),   // Lima = UTC−5 todo el año
      });
      onSaved();
    } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="sh"><div className="box"><h3>Editar yape</h3>
      <div className="g"><input inputMode="decimal" value={f.monto} onChange={up("monto")} /><input type="datetime-local" value={f.fecha} onChange={up("fecha")} /></div>
      <p><input placeholder="Emisor" value={f.emisor} onChange={up("emisor")} /></p>
      <p><input placeholder="Receptor" value={f.receptor} onChange={up("receptor")} /></p>
      <p><input placeholder="Comentario" value={f.comentario} onChange={up("comentario")} /></p>
      <p><select value={f.verificacion} onChange={up("verificacion")}><option value="">Sin revisar</option><option value="true">Verificado</option><option value="false">No encontrado / falso</option></select></p>
      {err && <p className="bad">{err}</p>}
      <div className="g"><button onClick={onClose}>Cancelar</button><button className="p" onClick={guardar}>Guardar</button></div>
    </div></div>
  );
}
