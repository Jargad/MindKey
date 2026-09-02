"use client";
import { useState, useEffect } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import { generatePassword, GeneratorOptions } from "@/lib/password-gen";
import {
  X, Copy, Eye, EyeOff, Star, Trash2, Edit3, Save, Share2,
  KeyRound, CreditCard, IdCard, Lock, FileText, StickyNote, Smartphone, Plus, RefreshCw,
} from "lucide-react";
import TotpDisplay from "@/components/totp/totp-display";
import PasswordGenerator from "@/components/generator/password-generator";
import { toast } from "sonner";

const TYPES = [
  { value: "login",    label: "Login",      icon: KeyRound },
  { value: "card",     label: "Tarjeta",    icon: CreditCard },
  { value: "identity", label: "Identidad",  icon: IdCard },
  { value: "password", label: "Contraseña", icon: Lock },
  { value: "document", label: "Documento",  icon: FileText },
  { value: "note",     label: "Nota",       icon: StickyNote },
  { value: "totp",     label: "TOTP",       icon: Smartphone },
];

const EMPTY_DATA: Record<string, object> = {
  login:    { url: "", username: "", password: "", notes: "" },
  card:     { cardholderName: "", number: "", expiry: "", cvv: "", pin: "", bank: "", notes: "" },
  identity: { type: "DNI", number: "", country: "", issuedAt: "", expiresAt: "", notes: "" },
  password: { password: "", notes: "" },
  document: { description: "", content: "", notes: "" },
  note:     { content: "" },
  totp:     { secret: "", issuer: "", label: "", digits: 6, period: 30 },
};

const NAME_PLACEHOLDERS: Record<string, string> = {
  login:    "Mi cuenta de Gmail…",
  card:     "Tarjeta Visa Débito…",
  identity: "Pasaporte / DNI Principal…",
  password: "Clave de WiFi Oficina…",
  document: "Contrato / Licencia…",
  note:     "Apuntes o notas privadas…",
  totp:     "Autenticador 2FA (GitHub, AWS…)…",
};

interface Props {
  item: { id: string; encryptedName: string; type: string; encryptedData: string; isFavorite: boolean; tags: { id: string; name: string; color: string }[] } | null;
  defaultType?: string;
  decryptedName: string | null;
  decryptedJson: string | null;
  onClose: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onRefresh: () => void;
  vaultKey: CryptoKey | null;
}

function Field({ label, value, secret }: {
  label: string; value: string; secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  const display = secret && !show ? "•".repeat(Math.min(value.length, 16)) : value;

  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        <div style={{
          flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", padding: ".5rem .875rem",
          fontSize: ".875rem", fontFamily: secret ? "'JetBrains Mono', monospace" : "inherit",
          wordBreak: "break-all", color: "var(--text-primary)", minHeight: 36,
        }}>
          {display || <span style={{ color: "var(--text-muted)" }}>—</span>}
        </div>
        {secret && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShow(!show)}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        {value && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={copy}>
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function renderViewFields(type: string, data: Record<string, string>) {
  switch (type) {
    case "login":
      return (<>
        <Field label="URL"       value={data.url || ""} />
        <Field label="Usuario"   value={data.username || ""} />
        <Field label="Contraseña" value={data.password || ""} secret />
        {data.notes && <Field label="Notas" value={data.notes} />}
      </>);
    case "card":
      return (<>
        <Field label="Titular"   value={data.cardholderName || ""} />
        <Field label="Número"    value={data.number || ""} secret />
        <Field label="Vencimiento" value={data.expiry || ""} />
        <Field label="CVV"       value={data.cvv || ""} secret />
        {data.pin  && <Field label="PIN"    value={data.pin}  secret />}
        {data.bank && <Field label="Banco"  value={data.bank} />}
        {data.notes && <Field label="Notas" value={data.notes} />}
      </>);
    case "identity":
      return (<>
        <Field label="Tipo"           value={data.type || ""} />
        <Field label="Número"         value={data.number || ""} />
        <Field label="País"           value={data.country || ""} />
        <Field label="Expedición"     value={data.issuedAt || ""} />
        <Field label="Vencimiento"    value={data.expiresAt || ""} />
        {data.notes && <Field label="Notas" value={data.notes} />}
      </>);
    case "password":
      return (<>
        <Field label="Contraseña" value={data.password || ""} secret />
        {data.notes && <Field label="Notas" value={data.notes} />}
      </>);
    case "document":
      return (<>
        <Field label="Descripción" value={data.description || ""} />
        <Field label="Contenido"   value={data.content || ""} />
        {data.notes && <Field label="Notas" value={data.notes} />}
      </>);
    case "note":
      return <Field label="Contenido" value={data.content || ""} />;
    case "totp":
      return (<>
        <TotpDisplay secret={data.secret} issuer={data.issuer} label={data.label} digits={Number(data.digits) || 6} period={Number(data.period) || 30} />
        <Field label="Secreto" value={data.secret || ""} secret />
        <Field label="Emisor"  value={data.issuer || ""} />
      </>);
    default: return null;
  }
}

function EditForm({ type, data, onChange }: { type: string; data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  const [showGen, setShowGen] = useState(false);

  const inp = (key: string, label: string, opts?: { type?: string; secret?: boolean; placeholder?: string }) => (
    <div className="form-group" key={key}>
      <label className="form-label">{label}</label>
      {opts?.secret ? (
        <div style={{ display: "flex", gap: ".5rem" }}>
          <input className="input input-mono flex-1" type="text" value={data[key] || ""} onChange={(e) => onChange(key, e.target.value)} placeholder={opts.placeholder} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowGen(true)} data-tooltip="Generador">
            <RefreshCw size={14} />
          </button>
        </div>
      ) : (
        <input className="input" type={opts?.type ?? "text"} value={data[key] || ""} onChange={(e) => onChange(key, e.target.value)} placeholder={opts?.placeholder} />
      )}
    </div>
  );

  const textarea = (key: string, label: string) => (
    <div className="form-group" key={key}>
      <label className="form-label">{label}</label>
      <textarea className="input" rows={3} value={data[key] || ""} onChange={(e) => onChange(key, e.target.value)} />
    </div>
  );

  return (
    <>
      {showGen && (
        <PasswordGenerator
          onSelect={(pw) => { onChange("password", pw); setShowGen(false); }}
          onClose={() => setShowGen(false)}
        />
      )}
      {type === "login" && (<>
        {inp("url",      "URL",       { type: "url", placeholder: "https://..." })}
        {inp("username", "Usuario",   { placeholder: "tu@email.com" })}
        {inp("password", "Contraseña",{ secret: true })}
        {textarea("notes", "Notas")}
      </>)}
      {type === "card" && (<>
        {inp("cardholderName", "Titular")}
        {inp("number",  "Número de tarjeta", { placeholder: "1234 5678 9012 3456" })}
        {inp("expiry",  "Vencimiento", { placeholder: "MM/AA" })}
        {inp("cvv",     "CVV",        { secret: true })}
        {inp("pin",     "PIN",        { secret: true })}
        {inp("bank",    "Banco")}
        {textarea("notes", "Notas")}
      </>)}
      {type === "identity" && (<>
        {inp("type",      "Tipo de documento", { placeholder: "DNI, Pasaporte..." })}
        {inp("number",    "Número")}
        {inp("country",   "País")}
        {inp("issuedAt",  "Fecha de expedición", { type: "date" })}
        {inp("expiresAt", "Fecha de vencimiento", { type: "date" })}
        {textarea("notes", "Notas")}
      </>)}
      {type === "password" && (<>
        {inp("password", "Contraseña", { secret: true })}
        {textarea("notes", "Notas")}
      </>)}
      {type === "document" && (<>
        {inp("description", "Descripción")}
        {textarea("content", "Contenido")}
        {textarea("notes",   "Notas")}
      </>)}
      {type === "note" && textarea("content", "Contenido")}
      {type === "totp" && (<>
        {inp("secret", "Secreto TOTP (base32)", { placeholder: "JBSWY3DPEHPK3PXP" })}
        {inp("issuer", "Emisor",  { placeholder: "GitHub" })}
        {inp("label",  "Etiqueta",{ placeholder: "usuario@email.com" })}
      </>)}
    </>
  );
}

export default function ItemModal({ item, defaultType, decryptedName, decryptedJson, onClose, onDelete, onShare, onRefresh, vaultKey }: Props) {
  const isNew  = !item;
  const initialType = item?.type ?? (defaultType && TYPES.some((t) => t.value === defaultType) ? defaultType : "login");
  const [mode, setMode]     = useState<"view"|"edit">(isNew ? "edit" : "view");
  const [type, setType]     = useState(initialType);
  const [name, setName]     = useState(decryptedName ?? "");
  const [data, setData]     = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (decryptedJson) {
      try { setData(JSON.parse(decryptedJson)); } catch { setData({}); }
    } else if (isNew) {
      setData(EMPTY_DATA[type] as Record<string, string> || {});
    }
  }, [decryptedJson, isNew, type]);

  function handleTypeChange(t: string) {
    setType(t);
    setData(EMPTY_DATA[t] as Record<string, string> || {});
  }

  async function save() {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    if (!vaultKey)    { setError("Vault bloqueado — vuelve a iniciar sesión"); return; }
    setSaving(true); setError("");
    try {
      const encryptedData = await encrypt(JSON.stringify(data), vaultKey);
      const encryptedName = await encrypt(name.trim(), vaultKey);
      const payload = { encryptedName, type, encryptedData };
      const url    = isNew ? "/api/vault" : `/api/vault/${item!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al guardar"); setSaving(false); return; }
      toast.success(isNew ? "Ítem creado correctamente" : "Ítem actualizado");
      onRefresh();
      onClose();
    } catch (e) { 
      setError("Error al cifrar. Verifica tu sesión."); 
      toast.error("Error al guardar");
      setSaving(false); 
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg animate-scale">
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>{isNew ? "Nuevo ítem" : name}</h3>
            {!isNew && <span style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}>{item?.type}</span>}
          </div>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            {!isNew && onShare && (
              <button className="btn btn-ghost btn-icon" onClick={onShare} data-tooltip="Compartir"><Share2 size={16} /></button>
            )}
            {!isNew && mode === "view" && (
              <button className="btn btn-ghost btn-icon" onClick={() => setMode("edit")} data-tooltip="Editar"><Edit3 size={16} /></button>
            )}
            {!isNew && onDelete && (
              <button className="btn btn-danger btn-icon" onClick={onDelete} data-tooltip="Eliminar"><Trash2 size={16} /></button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {mode === "edit" && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={NAME_PLACEHOLDERS[type] || "Nombre del ítem…"} />
              </div>
              {isNew && (
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                    {TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        tabIndex={-1}
                        onClick={() => handleTypeChange(value)}
                        className={`btn btn-sm ${type === value ? "btn-primary" : "btn-secondary"}`}
                      >
                        <Icon size={14} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <hr className="divider" />
              <EditForm type={type} data={data} onChange={(k, v) => setData((d) => ({ ...d, [k]: v }))} />
              {error && <div style={{ color: "var(--danger)", fontSize: ".8125rem" }}>{error}</div>}
            </>
          )}

          {mode === "view" && item && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {decryptedJson
                ? renderViewFields(item.type, JSON.parse(decryptedJson))
                : <div className="animate-pulse" style={{ height: 80, background: "var(--bg-card)", borderRadius: "var(--radius-md)" }} />
              }
            </div>
          )}
        </div>

        {mode === "edit" && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => isNew ? onClose() : setMode("view")}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={15} /> Guardar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
