"use client";

import { useState } from "react";
import { api, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const r = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password })
      });
      setToken(r.token);
      router.push("/pos");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Eshmat sement sentr</h1>
      <p>Kirish</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input placeholder="Login" value={login} onChange={(e) => setLogin(e.target.value)} />
        <input placeholder="Parol" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Kirish</button>
        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
      </form>

      <hr style={{ margin: "18px 0" }} />
      <div style={{ fontSize: 13, opacity: 0.8 }}>
        Kassirlar va admin login/parolni admin keyin o‘zgartiradi.
      </div>
    </main>
  );
}
