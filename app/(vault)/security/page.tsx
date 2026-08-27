"use client";
import { useEffect, useState, useMemo } from "react";
import { useVaultKey } from "@/contexts/vault-key-context";
import { decrypt } from "@/lib/crypto";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, KeyRound,
  EyeOff, RotateCcw, ChevronDown, ChevronUp, Edit3, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface VaultItem {
  id: string;
  encryptedName: string;
  type: string;
  encryptedData: string;
  isIgnoredFromAudit?: boolean;
}

interface AuditResult {
  total: number;
  weak: string[]; // ids
  reused: Record<string, string[]>; // password -> ids
  ignored: string[]; // ids
  score: number;
}

export default function SecurityAuditPage() {
  const { vaultKey } = useVaultKey();
  const [items, setItems]                     = useState<VaultItem[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [decryptedData, setDecryptedData]     = useState<Record<string, any>>({});
  const [decryptedNames, setDecryptedNames]   = useState<Record<string, string>>({});
  const [showIgnored, setShowIgnored]         = useState(false);

  // Sync ignore state with PostgreSQL database
  const toggleIgnore = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newIgnoredState = !item.isIgnoredFromAudit;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isIgnoredFromAudit: newIgnoredState } : i))
    );

    if (newIgnoredState) {
      toast.info("Elemento ignorado y sincronizado en tu cuenta");
    } else {
      toast.success("Elemento reactivado en la auditoría");
    }

    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isIgnoredFromAudit: newIgnoredState }),
      });

      if (!res.ok) {
        // Rollback on error
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isIgnoredFromAudit: !newIgnoredState } : i))
        );
        toast.error("Error al sincronizar con el servidor");
      }
    } catch {
      // Rollback on network failure
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isIgnoredFromAudit: !newIgnoredState } : i))
      );
      toast.error("Error de conexión al sincronizar");
    }
  };

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
        } catch (e) {
          console.error("Decryption failed", e);
        }
      }
      setDecryptedData(data);
      setDecryptedNames(names);
    };

    decryptAll();
  }, [items, vaultKey]);

  const audit = useMemo((): AuditResult => {
    const res: AuditResult = {
      total: items.length,
      weak: [],
      reused: {},
      ignored: [],
      score: 100,
    };
    if (Object.keys(decryptedData).length === 0) return res;

    const passwords: Record<string, string[]> = {};
    const itemMap = new Map(items.map((i) => [i.id, i]));

    Object.entries(decryptedData).forEach(([id, data]) => {
      const item = itemMap.get(id);
      if (item?.isIgnoredFromAudit) {
        res.ignored.push(id);
        return;
      }

      const pw = data.password;
      if (!pw) return;

      // Check weak (< 10 chars)
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
    const totalActiveWithPw = Object.keys(decryptedData).length - res.ignored.length;
    if (totalActiveWithPw > 0) {
      const weakPenalty = (res.weak.length / totalActiveWithPw) * 40;
      const reuseCount = Object.values(res.reused).flat().length;
      const reusePenalty = (reuseCount / totalActiveWithPw) * 60;
      res.score = Math.max(0, Math.round(100 - weakPenalty - reusePenalty));
    }

    return res;
  }, [items, decryptedData]);

  if (loading) {
    return (
      <div className="vault-content">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="animate-pulse" style={{ height: 160, borderRadius: "var(--radius-md)", background: "var(--bg-card)" }} />
          <div className="animate-pulse" style={{ height: 120, borderRadius: "var(--radius-md)", background: "var(--bg-card)" }} />
        </div>
      </div>
    );
  }

  const reusedIds = new Set(Object.values(audit.reused).flat());
  const hasIssues = audit.weak.length > 0 || reusedIds.size > 0;

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Auditoría de Seguridad</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>Análisis de robustez y salud de tus contraseñas</p>
        </div>
      </header>

      <div className="vault-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Top Section: Score Card + Stats Summary */}
        <div className="security-layout">
          {/* Score Card */}
          <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div style={{ position: "relative", width: 110, height: 110, marginBottom: ".75rem" }}>
              <svg width="110" height="110" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="9" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={audit.score > 80 ? "var(--success)" : audit.score > 50 ? "var(--warning)" : "var(--danger)"}
                  strokeWidth="9"
                  strokeDasharray={326}
                  strokeDashoffset={326 - (326 * audit.score) / 100}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.875rem", fontWeight: 800, lineHeight: 1 }}>
                {audit.score}
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: "1.0625rem" }}>Puntuación de Salud</h3>
            <p style={{ fontSize: ".8125rem", color: "var(--text-secondary)", marginTop: ".25rem" }}>
              {audit.score === 100
                ? "¡Excelente! Todas tus claves son seguras"
                : audit.score > 80
                ? "Buena seguridad general"
                : "Se recomienda fortalecer algunas contraseñas"}
            </p>
          </div>

          {/* Stats Summary Grid */}
          <div className="security-stats-grid">
            <div className="stat-card" style={{ padding: "1rem", borderColor: audit.weak.length > 0 ? "var(--danger)" : "var(--border)" }}>
              <div className="stat-icon" style={{ width: 38, height: 38, background: "var(--danger-light)", color: "var(--danger)" }}>
                <ShieldX size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="stat-value" style={{ fontSize: "1.375rem" }}>{audit.weak.length}</div>
                <div className="stat-label" style={{ fontSize: ".75rem" }}>Contraseñas débiles</div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: "1rem", borderColor: reusedIds.size > 0 ? "var(--warning)" : "var(--border)" }}>
              <div className="stat-icon" style={{ width: 38, height: 38, background: "#f59e0b1a", color: "var(--warning)" }}>
                <AlertTriangle size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="stat-value" style={{ fontSize: "1.375rem" }}>{reusedIds.size}</div>
                <div className="stat-label" style={{ fontSize: ".75rem" }}>Reutilizadas</div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: "1rem" }}>
              <div className="stat-icon" style={{ width: 38, height: 38, background: "var(--primary-light)", color: "var(--primary)" }}>
                <KeyRound size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="stat-value" style={{ fontSize: "1.375rem" }}>{Object.keys(decryptedData).length}</div>
                <div className="stat-label" style={{ fontSize: ".75rem" }}>Claves analizadas</div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: "1rem" }}>
              <div className="stat-icon" style={{ width: 38, height: 38, background: "rgba(16,185,129,0.12)", color: "var(--success)" }}>
                <ShieldCheck size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="stat-value" style={{ fontSize: "1.375rem" }}>{audit.ignored.length}</div>
                <div className="stat-label" style={{ fontSize: ".75rem" }}>Ignoradas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h3 style={{ marginBottom: ".75rem", fontSize: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
              Hallazgos de la Auditoría
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {/* Weak passwords list */}
              {audit.weak.map((id) => (
                <div
                  key={id}
                  className="card card-sm"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderLeft: "4px solid var(--danger)",
                    padding: ".875rem 1rem",
                    gap: ".75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem", minWidth: 0, flex: "1 1 200px" }}>
                    <ShieldX color="var(--danger)" size={20} style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: ".875rem" }}>
                        {decryptedNames[id] || "Cargando..."}
                      </div>
                      <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                        Contraseña demasiado corta (menos de 10 caracteres)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0, marginLeft: "auto" }}>
                    <button
                      type="button"
                      onClick={() => toggleIgnore(id)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: ".75rem", padding: ".35rem .65rem" }}
                      title="Ignorar esta advertencia si la web no permite contraseñas más largas"
                    >
                      <EyeOff size={13} /> Ignorar
                    </button>
                    <Link href={`/vault?id=${id}`} className="btn btn-secondary btn-sm" style={{ fontSize: ".75rem", padding: ".35rem .65rem" }}>
                      <Edit3 size={13} /> Cambiar
                    </Link>
                  </div>
                </div>
              ))}

              {/* Reused passwords list */}
              {Object.entries(audit.reused).map(([pw, ids]) => (
                <div
                  key={pw}
                  className="card card-sm"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: ".75rem",
                    borderLeft: "4px solid var(--warning)",
                    padding: ".875rem 1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <AlertTriangle color="var(--warning)" size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: ".875rem" }}>Contraseña reutilizada en {ids.length} sitios</div>
                      <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                        Si un sitio sufre una filtración, los demás quedan en riesgo.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", paddingLeft: "1.75rem" }}>
                    {ids.map((id) => (
                      <div
                        key={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: ".5rem",
                          background: "var(--bg-base)",
                          padding: ".4rem .75rem",
                          borderRadius: "var(--radius-sm)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="truncate" style={{ fontSize: ".8125rem", fontWeight: 500, minWidth: 0, flex: 1 }}>
                          {decryptedNames[id] || id}
                        </span>
                        <div style={{ display: "flex", gap: ".35rem", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => toggleIgnore(id)}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: ".75rem", padding: ".25rem .5rem" }}
                            title="Ignorar de la auditoría"
                          >
                            <EyeOff size={12} /> Ignorar
                          </button>
                          <Link href={`/vault?id=${id}`} className="btn btn-secondary btn-sm" style={{ fontSize: ".75rem", padding: ".25rem .5rem" }}>
                            Cambiar
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Clean state */}
              {!hasIssues && (
                <div className="empty-state" style={{ padding: "2.5rem 1rem" }}>
                  <ShieldCheck size={40} color="var(--success)" style={{ marginBottom: ".5rem" }} />
                  <h3 style={{ margin: 0, fontSize: "1.125rem" }}>¡Todo en orden!</h3>
                  <p style={{ fontSize: ".875rem", margin: ".25rem 0 0" }}>
                    No tienes contraseñas vulnerables o reutilizadas activas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ignored Items Section (Collapsible) */}
          {audit.ignored.length > 0 && (
            <div className="card" style={{ padding: "1rem 1.25rem", background: "var(--bg-base)" }}>
              <button
                type="button"
                onClick={() => setShowIgnored(!showIgnored)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 600, fontSize: ".875rem" }}>
                  <EyeOff size={16} color="var(--text-muted)" />
                  <span>Elementos ignorados ({audit.ignored.length})</span>
                </div>
                {showIgnored ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </button>

              {showIgnored && (
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginTop: ".875rem", paddingTop: ".875rem", borderTop: "1px solid var(--border)" }}>
                  <p style={{ fontSize: ".75rem", color: "var(--text-muted)", margin: 0 }}>
                    Estos elementos no restan puntos a tu calificación de seguridad debido a restricciones de páginas de terceros.
                  </p>

                  {audit.ignored.map((id) => (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: ".5rem .75rem",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        gap: ".5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="truncate" style={{ fontSize: ".8125rem", fontWeight: 500, minWidth: 0, flex: 1 }}>
                        {decryptedNames[id] || id}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleIgnore(id)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: ".75rem", padding: ".25rem .6rem" }}
                      >
                        <RotateCcw size={12} /> Reactivar en auditoría
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
