"use client";
import { useEffect, useRef, useState } from "react";
import { generateTotpCode, getTotpTimeRemaining } from "@/lib/totp";
import { Copy } from "lucide-react";

interface Props {
  secret: string;
  issuer: string;
  label: string;
  digits?: number;
  period?: number;
}

export default function TotpDisplay({ secret, issuer, label, digits = 6, period = 30 }: Props) {
  const [code, setCode]         = useState("------");
  const [remaining, setRemaining] = useState(period);
  const [copied, setCopied]     = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function refresh() {
    if (!secret) return;
    try {
      const c = generateTotpCode({ secret, issuer, label, digits, period });
      setCode(c);
    } catch { setCode("ERROR"); }
    setRemaining(getTotpTimeRemaining(period));
  }

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [secret, period]);

  const pct      = remaining / period;
  const radius   = 20;
  const circ     = 2 * Math.PI * radius;
  const offset   = circ * (1 - pct);
  const color    = remaining <= 5 ? "var(--danger)" : remaining <= 10 ? "var(--warning)" : "var(--success)";

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // Display with space in middle: "123 456"
  const display = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--bg-input)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem",
      marginBottom: ".5rem",
    }}>
      <div>
        {issuer && <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginBottom: ".25rem" }}>{issuer}</div>}
        <div className="totp-code">{display}</div>
        {label && <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: ".25rem" }}>{label}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".5rem" }}>
        <svg width={50} height={50} viewBox="0 0 50 50">
          <circle cx={25} cy={25} r={radius} fill="none" stroke="var(--border)" strokeWidth={3} />
          <circle
            className="totp-ring"
            cx={25} cy={25} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset .35s linear, stroke .5s ease" }}
          />
          <text x={25} y={29} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>{remaining}</text>
        </svg>
        <button className={`btn btn-ghost btn-icon btn-sm ${copied ? "copied" : ""}`} onClick={copy}>
          <Copy size={14} />
        </button>
      </div>
    </div>
  );
}
