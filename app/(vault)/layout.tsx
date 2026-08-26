"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ShieldCheck, LayoutDashboard, KeyRound, CreditCard, IdCard,
  Lock, FileText, StickyNote, Smartphone, Star, FolderOpen,
  Settings, LogOut, Tags, Share2, Plus,
} from "lucide-react";

import { useVaultKey } from "@/contexts/vault-key-context";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/vault",      label: "Todo el vault", icon: ShieldCheck },
  { href: "/security",   label: "Auditoría",     icon: ShieldCheck },
];

const TYPE_ITEMS = [
  { href: "/vault?type=login",    label: "Logins",       icon: KeyRound,   cls: "type-login" },
  { href: "/vault?type=card",     label: "Tarjetas",     icon: CreditCard, cls: "type-card" },
  { href: "/vault?type=identity", label: "Identidades",  icon: IdCard,     cls: "type-identity" },
  { href: "/vault?type=password", label: "Contraseñas",  icon: Lock,       cls: "type-password" },
  { href: "/vault?type=document", label: "Documentos",   icon: FileText,   cls: "type-document" },
  { href: "/vault?type=note",     label: "Notas",        icon: StickyNote, cls: "type-note" },
  { href: "/vault?type=totp",     label: "TOTP",         icon: Smartphone, cls: "type-totp" },
];

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router   = useRouter();
  const { clearSession, userEmail } = useVaultKey();

  async function handleLogout() {
    if (userEmail) {
      try { localStorage.setItem("gp_last_email", userEmail); } catch {}
    }
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    router.push("/login");
  }

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return pathname === path;
  };

  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <ShieldCheck size={20} color="#fff" />
        </div>
        <span className="sidebar-logo-text">GetPass</span>
      </div>

      <nav className="nav-section">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`nav-item ${isActive(href) ? "active" : ""}`}>
            <Icon size={16} className="nav-item-icon" />
            {label}
          </Link>
        ))}
      </nav>

      <nav className="nav-section" style={{ flex: 1 }}>
        <div className="nav-section-label">Categorías</div>
        {TYPE_ITEMS.map(({ href, label, icon: Icon, cls }) => (
          <Link key={href} href={href}
            className={`nav-item ${currentUrl === href ? "active" : ""}`}>
            <span className={`nav-item-icon ${cls}`} style={{ width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={12} />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: ".5rem", display: "flex", flexDirection: "column", gap: ".25rem" }}>
        <Link href="/settings" className={`nav-item ${isActive("/settings") ? "active" : ""}`}>
          <Settings size={16} className="nav-item-icon" /> Configuración
        </Link>
        <button onClick={handleLogout} className="nav-item" style={{ color: "var(--danger)", cursor: "pointer" }}>
          <LogOut size={16} className="nav-item-icon" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function Sidebar() {
  return (
    <Suspense fallback={<aside className="sidebar"><div style={{padding: "1rem"}}>Cargando...</div></aside>}>
      <SidebarContent />
    </Suspense>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  const isNavActive = (path: string) => {
    if (path === "/vault") {
      return pathname.startsWith("/vault");
    }
    return pathname === path;
  };

  return (
    <nav className="mobile-bottom-nav">
      <Link href="/dashboard" className={`mobile-nav-item ${isNavActive("/dashboard") ? "active" : ""}`}>
        <LayoutDashboard size={20} />
        <span>Inicio</span>
      </Link>

      <Link href="/vault" className={`mobile-nav-item ${isNavActive("/vault") ? "active" : ""}`}>
        <ShieldCheck size={20} />
        <span>Bóveda</span>
      </Link>

      <Link href="/vault?new=1" className="mobile-nav-add" aria-label="Nuevo elemento">
        <Plus size={22} strokeWidth={2.5} />
      </Link>

      <Link href="/security" className={`mobile-nav-item ${isNavActive("/security") ? "active" : ""}`}>
        <Lock size={20} />
        <span>Seguridad</span>
      </Link>

      <Link href="/settings" className={`mobile-nav-item ${isNavActive("/settings") ? "active" : ""}`}>
        <Settings size={20} />
        <span>Ajustes</span>
      </Link>
    </nav>
  );
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="vault-layout">
      <Sidebar />
      <main className="vault-main">{children}</main>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </div>
  );
}
