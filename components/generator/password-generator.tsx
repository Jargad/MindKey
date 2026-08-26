"use client";
import { useState, useEffect } from "react";
import { generatePassword, GeneratorOptions, GeneratedPassword } from "@/lib/password-gen";
import { RefreshCw, Copy, X } from "lucide-react";

const STRENGTH_COLOR: Record<string, string> = {
  "weak":       "var(--danger)",
  "fair":       "var(--warning)",
  "good":       "#84cc16",
  "strong":     "var(--success)",
  "very-strong":"var(--secondary)",
};
const STRENGTH_PCT: Record<string, string> = {
  "weak": "20%", "fair": "40%", "good": "60%", "strong": "80%", "very-strong": "100%",
};

const DEFAULT_OPTS: GeneratorOptions = {
  mode: "full", length: 20, caseSensitive: "mixed",
  separator: "-", includeSymbols: true, includeNumbers: true,
};

interface Props {
  onSelect?: (pw: string) => void;
  onClose?: () => void;
  inline?: boolean;
}

export default function PasswordGenerator({ onSelect, onClose, inline }: Props) {
  const [opts, setOpts]   = useState<GeneratorOptions>(DEFAULT_OPTS);
  const [result, setResult] = useState<GeneratedPassword | null>(null);
  const [copied, setCopied] = useState(false);

  function gen() {
    setResult(generatePassword(opts));
  }

  useEffect(() => { gen(); }, [opts]);

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const o = (k: keyof GeneratorOptions, v: unknown) =>
    setOpts((prev) => ({ ...prev, [k]: v }));

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Generated password */}
      <div style={{
        background: "var(--bg-input)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)", padding: ".875rem",
        display: "flex", alignItems: "center", gap: ".5rem",
      }}>
        <span style={{
          flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: ".9375rem",
          wordBreak: "break-all", color: "var(--text-primary)",
        }}>
          {result?.value ?? "Generando…"}
        </span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={gen} data-tooltip="Nueva contraseña">
          <RefreshCw size={15} />
        </button>
        <button className={`btn btn-ghost btn-icon btn-sm ${copied ? "copied" : ""}`} onClick={copy}>
          <Copy size={15} />
        </button>
      </div>

      {/* Strength */}
      {result && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".25rem", fontSize: ".75rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Fortaleza</span>
            <span style={{ color: STRENGTH_COLOR[result.strength], fontWeight: 600, textTransform: "capitalize" }}>
              {result.strength.replace("-", " ")} · {result.entropy} bits
            </span>
          </div>
          <div className="strength-bar">
            <div className="strength-fill"
              style={{ width: STRENGTH_PCT[result.strength], background: STRENGTH_COLOR[result.strength] }} />
          </div>
        </div>
      )}

      <hr className="divider" style={{ margin: ".25rem 0" }} />

      {/* Mode */}
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {(["full","alpha","numeric","memorable"] as const).map((m) => (
            <button key={m} type="button"
              className={`btn btn-sm ${opts.mode === m ? "btn-primary" : "btn-secondary"}`}
              onClick={() => o("mode", m)}>
              {m === "full" ? "Completo" : m === "alpha" ? "Alfanumérico" : m === "numeric" ? "Numérico" : "Memorable"}
            </button>
          ))}
        </div>
      </div>

      {/* Length */}
      <div className="form-group">
        <label className="form-label">
          {opts.mode === "memorable" ? "Palabras" : "Longitud"}: {opts.length}
        </label>
        <input type="range" min={opts.mode === "memorable" ? 2 : 8} max={opts.mode === "memorable" ? 8 : 64}
          value={opts.length} onChange={(e) => o("length", Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--primary)" }} />
      </div>

      {/* Mode-specific options */}
      {(opts.mode === "full" || opts.mode === "alpha") && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {opts.mode === "full" && (
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".875rem" }}>
              <input type="checkbox" checked={opts.includeSymbols}
                onChange={(e) => o("includeSymbols", e.target.checked)}
                style={{ accentColor: "var(--primary)" }} />
              Incluir símbolos
            </label>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".875rem" }}>
            <input type="checkbox" checked={opts.includeNumbers}
              onChange={(e) => o("includeNumbers", e.target.checked)}
              style={{ accentColor: "var(--primary)" }} />
            Incluir números
          </label>
        </div>
      )}

      {opts.mode === "memorable" && (
        <>
          <div className="form-group">
            <label className="form-label">Separador</label>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {(["-","_",".","·"," ","number","none"] as const).map((s) => (
                <button key={s} type="button"
                  className={`btn btn-sm ${opts.separator === s ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => o("separator", s)}>
                  {s === "number" ? "#num" : s === "none" ? "ninguno" : `"${s}"`}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Capitalización</label>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {(["lower","upper","title","camel","mixed"] as const).map((c) => (
                <button key={c} type="button"
                  className={`btn btn-sm ${opts.caseSensitive === c ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => o("caseSensitive", c)}>
                  {c === "lower" ? "minúsc." : c === "upper" ? "MAYÚSC." : c}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {onSelect && (
        <button className="btn btn-primary" onClick={() => onSelect(result?.value ?? "")}>
          Usar esta contraseña
        </button>
      )}
    </div>
  );

  if (inline) return body;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal animate-scale">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Generador de contraseñas</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{body}</div>
      </div>
    </div>
  );
}
