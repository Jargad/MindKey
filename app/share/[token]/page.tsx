"use client";
import { useEffect, useState } from "react";
import { importShareKey, decrypt } from "@/lib/crypto";
import { ShieldCheck, Lock, AlertCircle, Clock, Eye, EyeOff } from "lucide-react";

function Field({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        <div style={{
          flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", padding: ".5rem .875rem",
          fontSize: ".875rem", fontFamily: secret ? "'JetBrains Mono', monospace" : "inherit",
          wordBreak: "break-all", color: "var(--text-primary)",
        }}>
          {secret && !show ? "•".repeat(Math.min(value.length || 8, 20)) : (value || "—")}
        </div>
        {secret && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShow(!show)}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function renderData(data: Record<string, string>) {
  return Object.entries(data)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const secretKeys = ["password", "cvv", "pin", "secret", "number"];
      const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      return <Field key={k} label={label} value={v} secret={secretKeys.includes(k)} />;
    });
}

export default function ShareViewPage({ params }: { params: Promise<{ token: string }> }) {
  const [status, setStatus] = useState<"loading"|"success"|"error"|"expired">("loading");
  const [data, setData]     = useState<Record<string, string> | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");

  useEffect(() => {
    async function load() {
      const { token } = await params;
      const hash = window.location.hash;
      const match = hash.match(/[#&]KEY=([^&]+)/);
      if (!match) {
        setErrorMsg("Clave de descifrado no encontrada en la URL.");
        setStatus("error"); return;
      }
      const keyB64 = match[1];
      try {
        const res = await fetch(`/api/share/${token}`);
        if (res.status === 410) { setStatus("expired"); return; }
        if (!res.ok) { setErrorMsg("Link no válido o revocado."); setStatus("error"); return; }
        const { encryptedBlob, expiresAt: exp } = await res.json();
        const shareKey = await importShareKey(keyB64);
        const plaintext = await decrypt(encryptedBlob, shareKey);
        setData(JSON.parse(plaintext));
        setExpiresAt(exp);
        setStatus("success");
      } catch {
        setErrorMsg("No se pudo descifrar el contenido. La clave puede ser incorrecta.");
        setStatus("error");
      }
    }
    load();
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,.12), transparent)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)", padding: "2rem",
        boxShadow: "var(--shadow-lg)",
        animation: "slideUp .35s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.125rem" }}>GetPass</div>
            <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Ítem compartido cifrado</div>
          </div>
        </div>

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <span className="spinner" style={{ width: 32, height: 32, margin: "0 auto 1rem" }} />
            <p>Descifrando contenido…</p>
          </div>
        )}

        {status === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
            <AlertCircle size={40} color="var(--danger)" />
            <h3>No se puede descifrar</h3>
            <p style={{ fontSize: ".875rem" }}>{errorMsg}</p>
          </div>
        )}

        {status === "expired" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
            <Clock size={40} color="var(--warning)" />
            <h3>Link expirado</h3>
            <p style={{ fontSize: ".875rem" }}>Este link ya no está disponible.</p>
          </div>
        )}

        {status === "success" && data && (
          <>
            <div style={{
              background: "#10b98115", border: "1px solid var(--success)",
              borderRadius: "var(--radius-md)", padding: ".625rem .875rem",
              fontSize: ".8125rem", color: "var(--success)", display: "flex", gap: ".5rem",
              marginBottom: "1.25rem", alignItems: "center",
            }}>
              <Lock size={13} />
              Descifrado correctamente en tu navegador
              {expiresAt && <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: ".75rem" }}>
                Expira: {new Date(expiresAt).toLocaleString()}
              </span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {renderData(data)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
