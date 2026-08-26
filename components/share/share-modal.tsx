"use client";
import { useState } from "react";
import { encrypt, generateShareKey, exportKey } from "@/lib/crypto";
import { X, Link2, Clock, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const DURATIONS = [
  { value: "1h",        label: "1 hora" },
  { value: "24h",       label: "24 horas" },
  { value: "7d",        label: "7 días" },
  { value: "unlimited", label: "Sin expiración" },
];

interface Item { id: string; encryptedName: string; encryptedData: string; }

interface Props {
  item: Item;
  decryptedName: string | null;
  vaultKey: CryptoKey | null;
  onClose: () => void;
}

export default function ShareModal({ item, decryptedName, vaultKey, onClose }: Props) {
  const [duration, setDuration] = useState("24h");
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function createShare() {
    if (!vaultKey) { setError("Vault bloqueado — vuelve a iniciar sesión"); return; }
    setLoading(true); setError("");
    try {
      // 1. Decrypt the item with vault key
      const { decrypt } = await import("@/lib/crypto");
      const plaintext = await decrypt(item.encryptedData, vaultKey);

      // 2. Generate an ephemeral share key
      const shareKey    = await generateShareKey();
      const shareKeyB64 = await exportKey(shareKey);

      // 3. Re-encrypt with the share key
      const encryptedBlob = await encrypt(plaintext, shareKey);

      // 4. Post to server (server only sees the encrypted blob)
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, encryptedBlob, expiresIn: duration }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); setLoading(false); return; }
      const { token } = await res.json();

      // 5. Build URL — the key never goes to the server (hash fragment)
      const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      setShareUrl(`${base}/share/${token.id}#KEY=${shareKeyB64}`);
    } catch (e) { setError("Error al generar el link"); }
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Link copiado al portapapeles");
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm animate-scale">
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Compartir ítem</h3>
            <p style={{ fontSize: ".8125rem", marginTop: ".25rem" }}>{decryptedName || "Cargando..."}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!shareUrl ? (
            <>
              <div style={{
                background: "var(--primary-light)", border: "1px solid var(--primary)",
                borderRadius: "var(--radius-md)", padding: ".75rem .875rem",
                fontSize: ".8125rem", color: "var(--text-secondary)", display: "flex", gap: ".5rem",
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--primary)" }} />
                <span>La clave de descifrado viaja en el <strong>#fragmento</strong> de la URL. El servidor <strong>nunca la ve</strong>.</span>
              </div>

              <div className="form-group">
                <label className="form-label"><Clock size={14} style={{ display: "inline", marginRight: 4 }} />Duración del link</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                  {DURATIONS.map(({ value, label }) => (
                    <button key={value} type="button"
                      className={`btn btn-sm ${duration === value ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setDuration(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: "var(--danger)", fontSize: ".8125rem" }}>{error}</div>}

              <button className="btn btn-primary" onClick={createShare} disabled={loading}>
                {loading ? <span className="spinner" /> : <><Link2 size={16} /> Generar link</>}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: ".5rem", padding: ".5rem 0" }}>
                <CheckCircle size={40} color="var(--success)" />
                <span style={{ fontWeight: 600, color: "var(--success)" }}>Link generado</span>
              </div>

              <div style={{
                background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: ".625rem .875rem",
                fontSize: ".75rem", fontFamily: "'JetBrains Mono', monospace",
                wordBreak: "break-all", color: "var(--text-secondary)",
              }}>
                {shareUrl}
              </div>

              <button className="btn btn-primary" onClick={copy}>
                <Copy size={16} /> Copiar link
              </button>

              <p style={{ fontSize: ".75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Comparte este link completo. Sin el <code>#KEY=…</code> al final no se puede descifrar.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
