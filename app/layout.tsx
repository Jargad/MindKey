import type { Metadata, Viewport } from "next";
import { VaultKeyProvider } from "@/contexts/vault-key-context";
import { Toaster } from "sonner";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: { default: "Mindkey — Gestor de Contraseñas Seguro", template: "%s | Mindkey" },
  description: "Gestor de contraseñas con cifrado zero-knowledge AES-256-GCM. Guarda logins, tarjetas, identidades, notas y más con seguridad total.",
  keywords: ["gestor de contraseñas", "password manager", "seguridad", "cifrado", "AES-256"],
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <VaultKeyProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </VaultKeyProvider>
      </body>
    </html>
);
}
