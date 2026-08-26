"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, CreditCard, IdCard, Lock, FileText, StickyNote, Smartphone, ShieldCheck, Plus, Star, Clock } from "lucide-react";
import { useVaultKey } from "@/contexts/vault-key-context";
import { decrypt } from "@/lib/crypto";

const STATS = [
  { type: "login",    label: "Logins",      icon: KeyRound,   cls: "type-login" },
  { type: "card",     label: "Tarjetas",    icon: CreditCard, cls: "type-card" },
  { type: "identity", label: "Identidades", icon: IdCard,     cls: "type-identity" },
  { type: "password", label: "Contraseñas", icon: Lock,       cls: "type-password" },
  { type: "document", label: "Documentos",  icon: FileText,   cls: "type-document" },
  { type: "note",     label: "Notas",       icon: StickyNote, cls: "type-note" },
  { type: "totp",     label: "TOTP",        icon: Smartphone, cls: "type-totp" },
];

interface Item { id: string; encryptedName: string; type: string; updatedAt: string; isFavorite: boolean; }

export default function DashboardPage() {
  const { vaultKey } = useVaultKey();
  const [items, setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/vault").then((r) => r.json()).then((d) => {
      setItems(d.items ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Decrypt names when items and vaultKey are ready
  useEffect(() => {
    if (!vaultKey || items.length === 0) return;
    const decryptAll = async () => {
      const newNames: Record<string, string> = { ...decryptedNames };
      let changed = false;
      for (const item of items) {
        if (!newNames[item.id]) {
          try {
            newNames[item.id] = await decrypt(item.encryptedName, vaultKey);
            changed = true;
          } catch (e) { /* silent fail */ }
        }
      }
      if (changed) setDecryptedNames(newNames);
    };
    decryptAll();
  }, [items, vaultKey]);

  const countByType = (type: string) => items.filter((i) => i.type === type).length;
  const total       = items.length;
  const favorites   = items.filter((i) => i.isFavorite);
  const recent      = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Dashboard</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>Resumen de tu vault</p>
        </div>
        <Link href="/vault?new=1" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>
          <Plus size={15} /> Nuevo ítem
        </Link>
      </header>

      <div className="vault-content">
        {/* Hero stat */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* Hero stat */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-md)", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>{loading ? "—" : total}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: ".75rem", marginTop: ".125rem" }}>Ítems protegidos</div>
            </div>
          </div>

          {/* Security Audit Link */}
          <Link href="/security" className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem", textDecoration: "none", color: "inherit", cursor: "pointer", border: "1px solid var(--border)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-md)", background: "rgba(var(--success-rgb), 0.1)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Lock size={24} />
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.2 }}>Auditoría de Salud</div>
              <div style={{ color: "var(--text-secondary)", fontSize: ".75rem", marginTop: ".125rem" }}>Verificar seguridad →</div>
            </div>
          </Link>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "2rem" }}>
          {STATS.map(({ type, label, icon: Icon, cls }) => (
            <Link key={type} href={`/vault?type=${type}`} style={{ textDecoration: "none" }}>
              <div className="stat-card" style={{ cursor: "pointer" }}>
                <div className={`stat-icon ${cls}`}><Icon size={20} /></div>
                <div>
                  <div className="stat-value">{loading ? "—" : countByType(type)}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Recent */}
          <div>
            <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <Clock size={18} color="var(--primary)" /> Recientes
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: ".75rem" }}>
              {loading ? (
                <div className="animate-pulse" style={{ height: 120, borderRadius: "var(--radius-md)", background: "var(--bg-card)" }} />
              ) : recent.length === 0 ? (
                <div className="empty-state" style={{ padding: "2rem" }}>
                  <p>Sin ítems aún</p>
                </div>
              ) : recent.map((item) => (
                <Link key={item.id} href={`/vault?id=${item.id}`} style={{ textDecoration: "none" }}>
                  <div className="card card-sm" style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer" }}>
                    <span className={`type-${item.type}`} style={{ width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", flexShrink: 0 }}>
                      {item.type[0].toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: ".875rem" }}>
                        {decryptedNames[item.id] || "—"}
                      </div>
                      <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>{new Date(item.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Favorites */}
          <div>
            <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <Star size={18} color="var(--warning)" /> Favoritos
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: ".75rem" }}>
              {loading ? (
                <div className="animate-pulse" style={{ height: 120, borderRadius: "var(--radius-md)", background: "var(--bg-card)" }} />
              ) : favorites.length === 0 ? (
                <div className="empty-state" style={{ padding: "2rem" }}>
                  <p>Marca ítems como favoritos</p>
                </div>
              ) : favorites.map((item) => (
                <Link key={item.id} href={`/vault?id=${item.id}`} style={{ textDecoration: "none" }}>
                  <div className="card card-sm" style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer" }}>
                    <Star size={14} color="var(--warning)" />
                    <div className="truncate" style={{ fontWeight: 600, fontSize: ".875rem" }}>
                      {decryptedNames[item.id] || "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
