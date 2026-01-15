"use client";

import { useState } from "react";

export default function Page() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // keyin backend tayyor bo'lsa shu endpoint ishlaydi
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL topilmadi");

      const r = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "LOGIN_FAILED");

      localStorage.setItem("token", data.token);
      window.location.href = "/pos";
    } catch (err: any) {
      alert(err?.message || "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 10,
          fontFamily: "system-ui",
        }}
      >
        <h2 style={{ margin: 0 }}>Eshmat sement sentr</h2>
        <div style={{ opacity: 0.75 }}>Tizimga kirish</div>

        <input
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          placeholder="Parol"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button disabled={loading} style={{ padding: "10px 12px" }}>
          {loading ? "Kuting..." : "Kirish"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Admin va kassir loginlari bilan kirasiz.
        </div>
      </form>
    </main>
  );
}
