"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useVaultKey } from "@/contexts/vault-key-context";
import { decrypt } from "@/lib/crypto";
import {
  Plus, Search, Star, Trash2, Lock, FileText, StickyNote,
  Smartphone, Share2, KeyRound, CreditCard, IdCard,
} from "lucide-react";
import ItemModal from "@/components/vault/item-modal";
import ShareModal from "@/components/share/share-modal";
import { toast } from "sonner";

const TYPE_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  login:    { label: "Login",      icon: KeyRound,   cls: "type-login" },
  card:     { label: "Tarjeta",    icon: CreditCard, cls: "type-card" },
  identity: { label: "Identidad",  icon: IdCard,     cls: "type-identity" },
  password: { label: "Contraseña", icon: Lock,       cls: "type-password" },
  document: { label: "Documento",  icon: FileText,   cls: "type-document" },
  note:     { label: "Nota",       icon: StickyNote, cls: "type-note" },
  totp:     { label: "TOTP",       icon: Smartphone, cls: "type-totp" },
};

interface VaultItem {
  id: string; encryptedName: string; type: string; encryptedData: string;
  folderId: string | null; isFavorite: boolean; isIgnoredFromAudit?: boolean; updatedAt: string;
  tags: { id: string; name: string; color: string }[];
}



export default function VaultClient() {
  const searchParams = useSearchParams();
  const { vaultKey } = useVaultKey();
  const typeFilter   = searchParams.get("type") ?? "";
  const newParam     = searchParams.get("new");
  const defaultNewType = (newParam && newParam !== "1" && newParam !== "true") ? newParam : (typeFilter || "login");

  const [items, setItems]         = useState<VaultItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState("");
  const [selected, setSelected]   = useState<VaultItem | null>(null);
  const [decrypted, setDecrypted]           = useState<Record<string, string>>({}); // id -> decryptedData (JSON)
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({}); // id -> decryptedName
  const [showNew, setShowNew]               = useState(!!newParam);
  const [shareItem, setShareItem]           = useState<VaultItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (query)      params.set("q", query);
    const res  = await fetch(`/api/vault?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, [typeFilter, query]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Bulk decrypt names when items change
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
          } catch (e) { console.error("Error decrypting name", e); }
        }
      }
      if (changed) setDecryptedNames(newNames);
    };
    decryptAll();
  }, [items, vaultKey]);

  async function openItem(item: VaultItem) {
    setSelected(item);
    if (vaultKey && !decrypted[item.id]) {
      try {
        const plain = await decrypt(item.encryptedData, vaultKey);
        setDecrypted((d) => ({ ...d, [item.id]: plain }));
      } catch { /* vault key not loaded yet */ }
    }
  }

  async function toggleFavorite(item: VaultItem, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/vault/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !item.isFavorite }),
    });
    fetchItems();
  }

  async function deleteItem(id: string) {
    if (!confirm("¿Eliminar este ítem permanentemente?")) return;
    try {
      await fetch(`/api/vault/${id}`, { method: "DELETE" });
      toast.success("Ítem eliminado");
      setSelected(null);
      fetchItems();
    } catch { toast.error("Error al eliminar"); }
  }

  const title    = typeFilter ? (TYPE_META[typeFilter]?.label ?? "Vault") + "s" : "Todo el vault";
  const filtered = items.filter((i) => {
    const name = decryptedNames[i.id]?.toLowerCase() ?? "";
    return name.includes(query.toLowerCase());
  });

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>{title}</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>{filtered.length} ítems</p>
        </div>
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="input input-icon-left" placeholder="Buscar por nombre…"
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ height: 38 }}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <Plus size={15} /> Nuevo
        </button>
      </header>

      <div className="vault-content">
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: 120, background: "var(--bg-card)", borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Lock size={28} /></div>
            <h3>Sin ítems{query ? " que coincidan" : ""}</h3>
            <p>{query ? "Prueba con otro término de búsqueda" : "Empieza agregando tu primer ítem"}</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Agregar ítem</button>
          </div>
        ) : (
          <div className="item-grid">
            {filtered.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.note;
              const Icon = meta.icon;
              return (
                <div key={item.id} className="item-card" onClick={() => openItem(item)}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: ".75rem" }}>
                    <div className={`item-card-icon ${meta.cls}`}><Icon size={20} /></div>
                    <button className="btn btn-ghost btn-icon" onClick={(e) => toggleFavorite(item, e)}
                      style={{ color: item.isFavorite ? "var(--warning)" : "var(--text-muted)" }}
                      data-tooltip={item.isFavorite ? "Quitar favorito" : "Favorito"}>
                      <Star size={15} fill={item.isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="item-card-name truncate">
                    {decryptedNames[item.id] || <span className="animate-pulse" style={{ display: "inline-block", width: 100, height: 16, background: "var(--bg-input)", borderRadius: 4 }} />}
                  </div>
                  <div className="item-card-sub">{meta.label}</div>

                  {item.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".25rem", marginTop: ".625rem" }}>
                      {item.tags.map((t) => (
                        <span key={t.id} className="tag"
                          style={{ background: t.color + "22", color: t.color, borderColor: t.color + "44" }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="item-card-footer">
                    <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: "flex", gap: ".25rem" }}>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={(e) => { e.stopPropagation(); setShareItem(item); }}
                        data-tooltip="Compartir"><Share2 size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm"
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        data-tooltip="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <ItemModal
          item={selected}
          decryptedName={decryptedNames[selected.id] ?? null}
          decryptedJson={decrypted[selected.id] ?? null}
          onClose={() => setSelected(null)}
          onDelete={() => deleteItem(selected.id)}
          onShare={() => setShareItem(selected)}
          onRefresh={fetchItems}
          vaultKey={vaultKey}
        />
      )}

      {showNew && (
        <ItemModal
          item={null}
          defaultType={defaultNewType}
          decryptedName={null}
          decryptedJson={null}
          onClose={() => setShowNew(false)}
          onRefresh={fetchItems}
          vaultKey={vaultKey}
        />
      )}

      {shareItem && (
        <ShareModal
          item={shareItem}
          decryptedName={decryptedNames[shareItem.id] ?? null}
          vaultKey={vaultKey}
          onClose={() => setShareItem(null)}
        />
      )}
    </>
  );
}
