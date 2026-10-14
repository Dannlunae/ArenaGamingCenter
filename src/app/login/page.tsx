"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const [p, setP] = useState(""); const [err, setErr] = useState("");
  async function entrar() {
    try { await api("/api/v1/login", "POST", { password: p }); location.href = "/"; }
    catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="w"><h1>💜 Caja del cyber</h1>
      <div className="card">
        <input type="password" placeholder="Contraseña" value={p} autoFocus
          onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
        {err && <p className="bad">{err}</p>}
        <p><button className="p" onClick={entrar}>Entrar</button></p>
      </div>
    </div>
  );
}
