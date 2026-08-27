"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  KeyRound, CreditCard, IdCard, Lock, FileText, StickyNote,
  Smartphone, ShieldCheck, Plus, Star, Clock, ChevronRight, ShieldAlert,
} from "lucide-react";
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

interface Item {
  id: string;
  encryptedName: string;
  type: string;
  updatedAt: string;
  isFavorite: boolean;
}

export default function DashboardPage() {
  const { vaultKey } = useVaultKey();
  const [items, setItems]     = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab]           = useState<"recent" | "favorites">("recent");

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  const renderItemList = (list: Item[], emptyText: string) => {
    if (loading) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 52, borderRadius: "var(--radius-md)", background: "var(--bg-card)" }} />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="empty-state" style={{ padding: "1.5rem 1rem", minHeight: 120 }}>
          <p style={{ fontSize: ".875rem", margin: 0 }}>{emptyText}</p>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
        {list.map((item) => (
          <Link key={item.id} href={`/vault?id=${item.id}`} className="compact-item-row">
            <span
              className={`type-${item.type}`}
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: ".8125rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {item.type[0].toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="truncate" style={{ fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)" }}>
                {decryptedNames[item.id] || "—"}
              </div>
              <div style={{ fontSize: ".75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: ".5rem" }}>
                <span>{item.type}</span>
                <span>•</span>
                <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            {item.isFavorite && <Star size={14} color="var(--warning)" fill="currentColor" style={{ flexShrink: 0 }} />}
            <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    );
  };

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Dashboard</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>Resumen de tu vault</p>
        </div>
        <Link href="/vault?new=1" className="btn btn-primary btn-sm hide-mobile" style={{ marginLeft: "auto" }}>
          <Plus size={15} /> Nuevo
        </Link>
      </header>

      <div className="vault-content" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Top summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: ".75rem" }}>
          <div className="card card-sm" style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".875rem 1rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>{loading ? "—" : total}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: ".75rem", marginTop: ".15rem" }}>Ítems protegidos</div>
            </div>
          </div>

          <Link
            href="/security"
            className="card card-sm"
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".75rem",
              padding: ".875rem 1rem",
              textDecoration: "none",
              color: "inherit",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "rgba(var(--success-rgb), 0.1)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Lock size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: ".9375rem", fontWeight: 700, lineHeight: 1.2 }}>Auditoría de Salud</div>
              <div style={{ color: "var(--primary)", fontSize: ".75rem", marginTop: ".15rem", fontWeight: 600 }}>Verificar →</div>
            </div>
          </Link>
        </div>

        {/* Categories Section: Horizontal Scrolling on Mobile, Compact on Desktop */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
            <span style={{ fontSize: ".8125rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
              Categorías
            </span>
            <Link href="/vault" style={{ fontSize: ".75rem", color: "var(--primary)", fontWeight: 600 }}>
              Ver todas →
            </Link>
          </div>

          <div className="category-scroll-container">
            {STATS.map(({ type, label, icon: Icon, cls }) => (
              <Link key={type} href={`/vault?type=${type}`} className="category-chip">
                <span className={cls} style={{ width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={13} />
                </span>
                <span>{label}</span>
                <span className="category-chip-count">{loading ? "·" : countByType(type)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recientes & Favoritos: Tabbed on small screens / 2-Columns on desktop */}
        <div>
          {/* Mobile Tab Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
            <div className="segmented-tabs">
              <button
                type="button"
                onClick={() => setActiveTab("recent")}
                className={`segmented-tab-btn ${activeTab === "recent" ? "active" : ""}`}
              >
                <Clock size={14} /> Recientes ({recent.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className={`segmented-tab-btn ${activeTab === "favorites" ? "active" : ""}`}
              >
                <Star size={14} /> Favoritos ({favorites.length})
              </button>
            </div>
          </div>

          {/* Render Active Tab Content on mobile, or dual columns on large screens */}
          <div className="dashboard-lists-container">
            {activeTab === "recent" ? (
              renderItemList(recent, "No tienes elementos recientes")
            ) : (
              renderItemList(favorites, "No has marcado elementos como favoritos")
            )}
          </div>
        </div>
      </div>
    </>
  );
}
