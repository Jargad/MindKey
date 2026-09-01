"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultKey } from "@/contexts/vault-key-context";
import {
  ShieldCheck, User, Lock, Smartphone, LogOut, KeyRound,
  Database, Download, Upload, FileText, ChevronRight,
} from "lucide-react";
import PasswordGenerator from "@/components/generator/password-generator";
import { decrypt, encrypt } from "@/lib/crypto";
import { toast } from "sonner";

export default function SettingsPage() {
  const { vaultKey, userEmail, clearSession } = useVaultKey();
  const router = useRouter();
  const [tab, setTab]           = useState<"account"|"security"|"vault"|"generator">("account");
  const [loading, setLoading]   = useState(false);

  async function handleLogout() {
    if (userEmail) {
      try { localStorage.setItem("gp_last_email", userEmail); } catch {}
    }
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    router.push("/login");
  }

  async function handleExport() {
    if (!vaultKey) { toast.error("Vault bloqueado"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/vault");
      const { items } = await res.json();
      const rows = [["name", "type", "username", "password", "url", "notes"]];

      for (const item of items) {
        try {
          const name = await decrypt(item.encryptedName, vaultKey);
          const data = JSON.parse(await decrypt(item.encryptedData, vaultKey));
          rows.push([
            name, item.type, data.username || "", data.password || "", data.url || "", data.notes || ""
          ]);
        } catch (e) { console.error("Export skip", e); }
      }

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `mindkey_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportación completada");
    } catch (e) { toast.error("Error al exportar"); }
    setLoading(false);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vaultKey) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(l => l.split(",").map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"')));
        const headers = lines[0];
        const dataRows = lines.slice(1).filter(r => r.length >= 2);

        let success = 0;
        for (const row of dataRows) {
          try {
            const [name, type, username, password, url, notes] = row;
            const itemData = { username, password, url, notes };
            const encryptedName = await encrypt(name, vaultKey);
            const encryptedData = await encrypt(JSON.stringify(itemData), vaultKey);
            
            await fetch("/api/vault", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encryptedName, type: type || "login", encryptedData })
            });
            success++;
          } catch (e) { console.error("Import row failed", e); }
        }
        toast.success(`Importados ${success} ítems correctamente`);
      } catch (e) { toast.error("Error al procesar el archivo"); }
      setLoading(false);
    };
    reader.readAsText(file);
  }

  const TABS = [
    { id: "account",   label: "Cuenta",    icon: User },
    { id: "security",  label: "Seguridad", icon: Lock },
    { id: "vault",     label: "Bóveda",    icon: Database },
    { id: "generator", label: "Generador", icon: KeyRound },
  ] as const;

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Configuración</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>Ajustes de tu cuenta y seguridad</p>
        </div>
      </header>

      <div className="vault-content">
        <div className="settings-container">
          {/* Mobile Horizontal Tabs */}
          <div className="settings-tabs-mobile">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="category-chip"
                style={{
                  borderColor: tab === id ? "var(--primary)" : "var(--border)",
                  background: tab === id ? "var(--primary-light)" : "var(--bg-card)",
                  color: tab === id ? "var(--primary)" : "var(--text-primary)",
                  fontWeight: tab === id ? 700 : 500,
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Desktop Sidebar tabs */}
          <div className="settings-sidebar">
            <nav style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`nav-item ${tab === id ? "active" : ""}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
              <hr className="divider" />
              <button onClick={handleLogout} className="nav-item" style={{ color: "var(--danger)", cursor: "pointer" }}>
                <LogOut size={15} /> Cerrar sesión
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="settings-content-area">

            {tab === "account" && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.0625rem" }}>Información de cuenta</h3>
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <div className="input" style={{ cursor: "default", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                    {userEmail ?? "—"}
                  </div>
                </div>
                <div style={{
                  background: "var(--primary-light)", border: "1px solid var(--primary)",
                  borderRadius: "var(--radius-md)", padding: ".75rem .875rem",
                  fontSize: ".8125rem", display: "flex", gap: ".625rem", alignItems: "flex-start",
                }}>
                  <ShieldCheck size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Tu bóveda está protegida con <strong>AES-256-GCM</strong> y clave derivada con <strong>PBKDF2 (600,000 iteraciones)</strong>. El servidor jamás almacena tu clave maestra.</span>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: ".5rem" }}>
                  <button
                    onClick={handleLogout}
                    className="btn btn-danger"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              </div>
            )}

            {tab === "security" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.0625rem" }}>Autenticación en dos pasos (TOTP)</h3>
                  <p style={{ fontSize: ".875rem", margin: 0 }}>
                    Protege el acceso a tu cuenta con una app autenticadora (Google Authenticator, Microsoft Authenticator o Authy).
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                      <Smartphone size={16} color="var(--primary)" />
                      <span style={{ fontSize: ".875rem", fontWeight: 500 }}>TOTP 2FA</span>
                    </div>
                    <span className="badge badge-muted">Próximamente</span>
                  </div>
                </div>

                <div className="card" style={{ display: "flex", flexDirection: "column", gap: ".75rem", padding: "1.25rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.0625rem" }}>Especificaciones de seguridad</h3>
                  {[
                    ["Algoritmo de cifrado", "AES-256-GCM"],
                    ["Función de derivación", "PBKDF2-SHA256"],
                    ["Iteraciones PBKDF2", "600,000"],
                    ["Tamaño del IV", "96 bits (aleatorio)"],
                    ["Cifrado del lado", "Cliente (navegador)"],
                    ["El servidor ve…", "Solo blobs cifrados"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".8125rem", padding: ".4rem 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: ".5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{k}</span>
                      <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: ".75rem" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "vault" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Export */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <div style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", padding: ".5rem", borderRadius: "var(--radius-md)", flexShrink: 0 }}>
                      <Download size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.0625rem" }}>Exportar datos</h3>
                      <p style={{ fontSize: ".8125rem", color: "var(--text-muted)", margin: 0 }}>Descarga todos tus ítems en formato CSV descifrado.</p>
                    </div>
                  </div>
                  <p style={{ fontSize: ".8125rem", background: "rgba(var(--warning-rgb), 0.1)", color: "var(--warning)", padding: ".75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--warning)", margin: 0 }}>
                    ⚠️ <strong>Atención:</strong> El archivo resultante estará <strong>sin cifrar</strong>. Guárdalo en un lugar seguro o bórralo tras usarlo.
                  </p>
                  <button className="btn btn-primary" onClick={handleExport} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                    {loading ? <span className="spinner" /> : <><Download size={16} /> Descargar CSV (.csv)</>}
                  </button>
                </div>

                {/* Import */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <div style={{ background: "rgba(var(--success-rgb), 0.1)", color: "var(--success)", padding: ".5rem", borderRadius: "var(--radius-md)", flexShrink: 0 }}>
                      <Upload size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.0625rem" }}>Importar datos</h3>
                      <p style={{ fontSize: ".8125rem", color: "var(--text-muted)", margin: 0 }}>Sube un archivo CSV para importar ítems masivamente.</p>
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type="file" accept=".csv" onChange={handleImport} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} disabled={loading} />
                    <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
                      {loading ? <span className="spinner" /> : <><Upload size={16} /> Seleccionar archivo CSV</>}
                    </button>
                  </div>
                  <p style={{ fontSize: ".75rem", color: "var(--text-muted)", textAlign: "center", margin: 0, wordBreak: "break-all" }}>
                    Formato: <code>nombre, tipo, usuario, contraseña, url, notas</code>
                  </p>
                </div>
              </div>
            )}

            {tab === "generator" && (
              <div className="card" style={{ padding: "1.25rem" }}>
                <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.0625rem" }}>Generador de contraseñas</h3>
                <PasswordGenerator inline />
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
