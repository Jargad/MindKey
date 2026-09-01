"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVaultKey } from "@/contexts/vault-key-context";
import { decrypt } from "@/lib/crypto";
import {
  Plus, Search, Star, Trash2, Lock, FileText, StickyNote,
  Smartphone, Share2, KeyRound, CreditCard, IdCard, ArrowUpDown, X,
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
  id: string;
  encryptedName: string;
  type: string;
  encryptedData: string;
  folderId: string | null;
  isFavorite: boolean;
  isIgnoredFromAudit?: boolean;
  useCount?: number;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt: string;
  tags: { id: string; name: string; color: string }[];
}

export default function VaultClient() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { vaultKey } = useVaultKey();
  const typeFilter   = searchParams.get("type") ?? "";
  const newParam     = searchParams.get("new");
  const defaultNewType = (newParam && newParam !== "1" && newParam !== "true") ? newParam : (typeFilter || "login");

  const [items, setItems]                   = useState<VaultItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [query, setQuery]                   = useState("");
  const [sortMode, setSortMode]             = useState<string>("updated-desc");
  const [selected, setSelected]             = useState<VaultItem | null>(null);
  const [decrypted, setDecrypted]           = useState<Record<string, string>>({}); // id -> decryptedData (JSON)
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({}); // id -> decryptedName
  const [showNew, setShowNew]               = useState(!!newParam);
  const [shareItem, setShareItem]           = useState<VaultItem | null>(null);

  // Load saved sort preference
  useEffect(() => {
    try {
      const savedSort = localStorage.getItem("gp_vault_sort");
      if (savedSort) setSortMode(savedSort);
    } catch {}
  }, []);

  const handleSortChange = (newSort: string) => {
    setSortMode(newSort);
    try {
      localStorage.setItem("gp_vault_sort", newSort);
    } catch {}
  };

  // Sync showNew with query param or custom event
  useEffect(() => {
    if (newParam) {
      setShowNew(true);
    }
  }, [newParam]);

  useEffect(() => {
    const handleOpenNew = () => setShowNew(true);
    window.addEventListener("gp-open-new-item", handleOpenNew);
    return () => window.removeEventListener("gp-open-new-item", handleOpenNew);
  }, []);

  const handleCloseNew = () => {
    setShowNew(false);
    if (searchParams.get("new")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  };

  // Fetch items from server ONLY when typeFilter changes (no server request on search input)
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    try {
      const res  = await fetch(`/api/vault?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      console.error("Error loading vault items", e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

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

    // Increment usage frequency
    const newCount = (item.useCount || 0) + 1;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, useCount: newCount, lastUsedAt: now } : i))
    );
    try {
      fetch(`/api/vault/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCount: newCount, lastUsedAt: now }),
      }).catch(() => {});
    } catch {}
  }

  async function toggleFavorite(item: VaultItem, e: React.MouseEvent) {
    e.stopPropagation();
    const newFavorite = !item.isFavorite;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isFavorite: newFavorite } : i))
    );
    try {
      await fetch(`/api/vault/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newFavorite }),
      });
    } catch {
      fetchItems();
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("¿Eliminar este ítem permanentemente?")) return;
    try {
      await fetch(`/api/vault/${id}`, { method: "DELETE" });
      toast.success("Ítem eliminado");
      setSelected(null);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { toast.error("Error al eliminar"); }
  }

  // In-memory filtered and sorted items
  const filteredAndSorted = useMemo(() => {
    let result = items;

    // Filter in-memory (no server request)
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter((i) => {
        const name = (decryptedNames[i.id] || "").toLowerCase();
        const typeLabel = (TYPE_META[i.type]?.label || i.type).toLowerCase();
        const tags = (i.tags || []).map((t) => t.name.toLowerCase()).join(" ");
        return name.includes(q) || typeLabel.includes(q) || tags.includes(q);
      });
    }

    // Sort in-memory
    return [...result].sort((a, b) => {
      switch (sortMode) {
        case "name-asc": {
          const nameA = (decryptedNames[a.id] || "").trim();
          const nameB = (decryptedNames[b.id] || "").trim();
          return nameA.localeCompare(nameB, "es", { sensitivity: "base", numeric: true });
        }
        case "name-desc": {
          const nameA = (decryptedNames[a.id] || "").trim();
          const nameB = (decryptedNames[b.id] || "").trim();
          return nameB.localeCompare(nameA, "es", { sensitivity: "base", numeric: true });
        }
        case "created-desc": {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        case "created-asc": {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        }
        case "type-asc": {
          const typeA = TYPE_META[a.type]?.label || a.type;
          const typeB = TYPE_META[b.type]?.label || b.type;
          const typeCompare = typeA.localeCompare(typeB, "es");
          if (typeCompare !== 0) return typeCompare;
          return (decryptedNames[a.id] || "").localeCompare(decryptedNames[b.id] || "", "es");
        }
        case "usage-desc": {
          const countA = a.useCount || 0;
          const countB = b.useCount || 0;
          if (countB !== countA) return countB - countA;
          const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return (decryptedNames[a.id] || "").localeCompare(decryptedNames[b.id] || "", "es");
        }
        case "updated-desc":
        default: {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        }
      }
    });
  }, [items, query, decryptedNames, sortMode]);

  const title = typeFilter ? (TYPE_META[typeFilter]?.label ?? "Vault") + "s" : "Todo el vault";

  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>{title}</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>{filteredAndSorted.length} ítems</p>
        </div>

        {/* In-Memory Instant Search */}
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="input input-icon-left"
            placeholder="Buscar por nombre, tipo o etiqueta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ height: 38 }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: ".75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 0,
                display: "flex",
              }}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="sort-wrap">
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <ArrowUpDown size={14} style={{ position: "absolute", left: ".75rem", color: "var(--text-muted)", pointerEvents: "none" }} />
            <select
              className="input"
              value={sortMode}
              onChange={(e) => handleSortChange(e.target.value)}
              style={{
                height: 38,
                paddingLeft: "2.25rem",
                paddingRight: "1.75rem",
                cursor: "pointer",
                fontSize: ".8125rem",
                minWidth: 155,
              }}
              aria-label="Ordenar elementos"
            >
              <option value="updated-desc">🕒 Modificación reciente</option>
              <option value="name-asc">🔤 Nombre (A - Z)</option>
              <option value="name-desc">🔤 Nombre (Z - A)</option>
              <option value="created-desc">📅 Creación: más nuevos</option>
              <option value="created-asc">⏳ Creación: más antiguos</option>
              <option value="type-asc">🏷️ Tipo de elemento</option>
              <option value="usage-desc">🔥 Frecuencia de uso</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary btn-sm hide-mobile" onClick={() => setShowNew(true)}>
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
        ) : filteredAndSorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Lock size={28} /></div>
            <h3>Sin ítems{query ? " que coincidan" : ""}</h3>
            <p>{query ? "Prueba con otro término de búsqueda" : "Empieza agregando tu primer ítem"}</p>
            {query ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setQuery("")}>Limpiar búsqueda</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Agregar ítem</button>
            )}
          </div>
        ) : (
          <div className="item-grid">
            {filteredAndSorted.map((item) => {
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
          onClose={handleCloseNew}
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
