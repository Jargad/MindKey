"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initVaultKey, useVaultKey } from "@/contexts/vault-key-context";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useVaultKey();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function strength(pw: string) {
    let score = 0;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }
  const sc = strength(password);
  const strengthLabels = ["", "Débil", "Regular", "Buena", "Fuerte"];
  const strengthColors = ["", "var(--danger)", "var(--warning)", "#84cc16", "var(--success)"];
  const strengthPct    = password ? `${sc * 25}%` : "0%";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 8)  { setError("Mínimo 8 caracteres"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al registrar"); setLoading(false); return; }
      await initVaultKey(password, data.user.salt, data.user.id, data.user.email, setSession);
      router.push("/dashboard");
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <ShieldCheck size={26} color="#fff" />
          </div>
          <span style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-.03em" }}>Mindkey</span>
        </div>

        <h1 style={{ fontSize: "1.375rem", marginBottom: ".25rem" }}>Crear cuenta</h1>
        <p style={{ fontSize: ".875rem", marginBottom: "1.75rem" }}>Tu contraseña maestra cifra todo tu vault</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <div className="relative">
              <Mail size={16} className="search-icon" style={{ left: ".75rem" }} />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com" className="input input-icon-left" required autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pw">Contraseña maestra</label>
            <div className="relative">
              <Lock size={16} className="search-icon" style={{ left: ".75rem" }} />
              <input id="pw" type={showPw ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="input input-icon-left input-icon-right" required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: ".75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div style={{ marginTop: ".5rem" }}>
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: strengthPct, background: strengthColors[sc] }} />
                </div>
                <span style={{ fontSize: ".75rem", color: strengthColors[sc] }}>{strengthLabels[sc]}</span>
              </div>
            )}
            <span className="form-hint">⚠️ No podrás recuperar tu vault si pierdes esta contraseña</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirmar contraseña</label>
            <div className="relative">
              <Lock size={16} className="search-icon" style={{ left: ".75rem" }} />
              <input id="confirm" type={showPw ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite tu contraseña"
                className="input input-icon-left" required autoComplete="new-password" />
            </div>
          </div>

          {error && (
            <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", padding: ".625rem .875rem", fontSize: ".8125rem", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: ".25rem" }}>
            {loading ? <span className="spinner" /> : <><UserPlus size={18} /> Crear cuenta</>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: ".875rem", color: "var(--text-muted)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
