import { Suspense } from "react";
import VaultClient from "./vault-client";
import { Lock } from "lucide-react";

function LoadingSkeleton() {
  return (
    <>
      <header className="vault-header">
        <div>
          <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Vault</h2>
          <p style={{ fontSize: ".8125rem", margin: 0 }}>Cargando…</p>
        </div>
      </header>
      <div className="vault-content">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse"
              style={{ height: 120, background: "var(--bg-card)", borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <VaultClient />
    </Suspense>
  );
}
