"use client";
import { useEffect, useState, useMemo } from "react";
import { useVaultKey } from "@/contexts/vault-key-context";
import { decrypt } from "@/lib/crypto";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, RefreshCw, KeyRound } from "lucide-react";
import Link from "next/link";

interface VaultItem {
  id: string;
  encryptedName: string;
  type: string;
  encryptedData: string;
}

interface AuditResult {
  total: number;
  weak: string[]; // ids
  reused: Record<string, string[]>; // password -> ids
  vulnerable: string[]; // ids
  score: number;
}

export default function SecurityAuditPage() {
  const { vaultKey } = useVaultKey();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decryptedData, setDecryptedData] = useState<Record<string, any>>({});
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!vaultKey || items.length === 0) return;
    
    const decryptAll = async () => {
      const data: Record<string, any> = {};
      const names: Record<string, string> = {};
      
      for (const item of items) {
        try {
          const name = await decrypt(item.encryptedName, vaultKey);
          names[item.id] = name;
          
          if (item.type === "login" || item.type === "password") {
            const json = await decrypt(item.encryptedData, vaultKey);
            data[item.id] = JSON.parse(json);
          }
        } catch (e) { console.error("Decryption failed", e); }
      }
      setDecryptedData(data);
      setDecryptedNames(names);
    };
    
    decryptAll();
  }, [items, vaultKey]);

  const audit = useMemo((): AuditResult => {
    const res: AuditResult = { total: items.length, weak: [], reused: {}, vulnerable: [], score: 100 };
    if (Object.keys(decryptedData).length === 0) return res;

    const passwords: Record<string, string[]> = {};

    Object.entries(decryptedData).forEach(([id, data]) => {
      const pw = data.password;
      if (!pw) return;

      // Check weak
      if (pw.length < 10) res.weak.push(id);
      
      // Check reuse
      if (!passwords[pw]) passwords[pw] = [];
      passwords[pw].push(id);
    });

    Object.entries(passwords).forEach(([pw, ids]) => {
      if (ids.length > 1) {
        res.reused[pw] = ids;
      }
    });

    // Calculate score
    const totalWithPw = Object.keys(decryptedData).length;
    if (totalWithPw > 0) {
      const weakPenalty = (res.weak.length / totalWithPw) * 40;
      const reuseCount = Object.values(res.reused).flat().length;
      const reusePenalty = (reuseCount / totalWithPw) * 60;
      res.score = Math.max(0, Math.round(100 - weakPenalty - reusePenalty));
    }

    return res;
  }, [items.length, decryptedData]);

  if (loading) return <div className="vault-content">Cargando...</div>;

  const reusedIds = new Set(Object.values(audit.reused).flat());

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Auditoría de Seguridad</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>Analizando la salud de tus contraseñas</p>
        </div>
      </header>

      <div className="vault-content">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
          {/* Score Card */}
          <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ position: "relative", width: 120, height: 120, marginBottom: "1rem" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none" stroke={audit.score > 80 ? "var(--success)" : audit.score > 50 ? "var(--warning)" : "var(--danger)"} 
                  strokeWidth="8" strokeDasharray={340} strokeDashoffset={340 - (340 * audit.score) / 100}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "2rem", fontWeight: 800 }}>
                {audit.score}
              </div>
            </div>
            <h3 style={{ margin: 0 }}>Puntuación de Salud</h3>
            <p style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>
              {audit.score === 100 ? "¡Excelente seguridad!" : audit.score > 80 ? "Buena seguridad" : "Necesitas mejorar algunas claves"}
            </p>
          </div>

          {/* Stats Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="stat-card" style={{ borderColor: audit.weak.length > 0 ? "var(--danger)" : "var(--border)" }}>
              <div className="stat-icon" style={{ background: "rgba(var(--danger-rgb), 0.1)", color: "var(--danger)" }}><ShieldX size={20} /></div>
              <div>
                <div className="stat-value">{audit.weak.length}</div>
                <div className="stat-label">Contraseñas débiles</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderColor: reusedIds.size > 0 ? "var(--warning)" : "var(--border)" }}>
              <div className="stat-icon" style={{ background: "rgba(var(--warning-rgb), 0.1)", color: "var(--warning)" }}><AlertTriangle size={20} /></div>
              <div>
                <div className="stat-value">{reusedIds.size}</div>
                <div className="stat-label">Contraseñas reutilizadas</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)" }}><KeyRound size={20} /></div>
              <div>
                <div className="stat-value">{Object.keys(decryptedData).length}</div>
                <div className="stat-label">Claves analizadas</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(var(--success-rgb), 0.1)", color: "var(--success)" }}><ShieldCheck size={20} /></div>
              <div>
                <div className="stat-value">{items.length - audit.weak.length - reusedIds.size}</div>
                <div className="stat-label">Ítems seguros</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Detalles del Análisis</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {audit.weak.map(id => (
              <div key={id} className="card card-sm" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid var(--danger)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <ShieldX color="var(--danger)" size={18} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{decryptedNames[id] || "Cargando..."}</div>
                    <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Contraseña demasiado corta (menos de 10 caracteres)</div>
                  </div>
                </div>
                <Link href={`/vault?id=${id}`} className="btn btn-ghost btn-sm">Cambiar</Link>
              </div>
            ))}

            {Object.entries(audit.reused).map(([pw, ids]) => (
              <div key={pw} className="card card-sm" style={{ display: "flex", flexDirection: "column", gap: ".75rem", borderLeft: "4px solid var(--warning)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <AlertTriangle color="var(--warning)" size={18} />
                  <div style={{ fontWeight: 600 }}>Contraseña reutilizada en {ids.length} sitios</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", paddingLeft: "1.75rem" }}>
                  {ids.map(id => (
                    <Link key={id} href={`/vault?id=${id}`} className="btn btn-secondary btn-xs">
                      {decryptedNames[id] || id}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {audit.weak.length === 0 && reusedIds.size === 0 && (
              <div className="empty-state" style={{ padding: "4rem" }}>
                <ShieldCheck size={48} color="var(--success)" style={{ marginBottom: "1rem" }} />
                <h3>¡Todo en orden!</h3>
                <p>No se encontraron contraseñas débiles o reutilizadas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
