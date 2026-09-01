"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initVaultKey, useVaultKey } from "@/contexts/vault-key-context";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, LogIn, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useVaultKey();
  const passwordRef    = useRef<HTMLInputElement>(null);
  const emailRef       = useRef<HTMLInputElement>(null);

  const [email, setEmail]               = useState("");
  const [hasSavedEmail, setHasSavedEmail] = useState(false);
  const [password, setPassword]         = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [totp, setTotp]                 = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gp_last_email");
      if (saved) {
        setEmail(saved);
        setHasSavedEmail(true);
        // Autofocus directly on the master password input
        setTimeout(() => {
          passwordRef.current?.focus();
        }, 50);
      }
    } catch {}
  }, []);

  function handleSwitchAccount() {
    setHasSavedEmail(false);
    setEmail("");
    try { localStorage.removeItem("gp_last_email"); } catch {}
    setTimeout(() => {
      emailRef.current?.focus();
    }, 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, totpCode: totp || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.totpRequired) { setTotpRequired(true); setLoading(false); return; }
        setError(data.error ?? "Error al iniciar sesión");
        setLoading(false); return;
      }

      // Save email for next time
      try { localStorage.setItem("gp_last_email", email.trim()); } catch {}

      // Derive vault key in-browser
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

        <h1 style={{ fontSize: "1.375rem", marginBottom: ".25rem" }}>Bienvenido de vuelta</h1>
        <p style={{ fontSize: ".875rem", marginBottom: "1.75rem" }}>
          {hasSavedEmail ? "Ingresa tu contraseña maestra para desbloquear el vault" : "Ingresa con tu contraseña maestra"}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".375rem" }}>
              <label className="form-label" htmlFor="email" style={{ margin: 0 }}>Correo electrónico</label>
              {hasSavedEmail && (
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: ".75rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Usar otra cuenta
                </button>
              )}
            </div>
            <div className="relative">
              <Mail size={16} className="search-icon" style={{ left: ".75rem" }} />
              <input
                ref={emailRef}
                id="email" type="email" value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (hasSavedEmail) setHasSavedEmail(false);
                }}
                placeholder="tu@correo.com"
                className="input input-icon-left" required autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña maestra</label>
            <div className="relative">
              <Lock size={16} className="search-icon" style={{ left: ".75rem" }} />
              <input
                ref={passwordRef}
                id="password" type={showPw ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input input-icon-left input-icon-right" required autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: ".75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {totpRequired && (
            <div className="form-group animate-up">
              <label className="form-label" htmlFor="totp">Código de verificación (TOTP)</label>
              <input
                id="totp" type="text" value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="123456"
                className="input input-mono" maxLength={6} inputMode="numeric"
              />
            </div>
          )}

          {error && (
            <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", padding: ".625rem .875rem", fontSize: ".8125rem", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: ".25rem" }}>
            {loading ? <span className="spinner" /> : <><LogIn size={18} /> Iniciar sesión</>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: ".875rem", color: "var(--text-muted)" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/register" style={{ color: "var(--primary)", fontWeight: 600 }}>Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
