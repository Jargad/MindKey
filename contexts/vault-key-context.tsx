"use client";
import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { deriveKey } from "@/lib/crypto";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

interface VaultKeyContextValue {
  vaultKey: CryptoKey | null;
  userSalt: string | null;
  userId: string | null;
  userEmail: string | null;
  setSession: (key: CryptoKey, salt: string, id: string, email: string) => void;
  clearSession: () => void;
}

const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export function VaultKeyProvider({ children }: { children: ReactNode }) {
  const [vaultKey, setVaultKey]   = useState<CryptoKey | null>(null);
  const [userSalt, setUserSalt]   = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearSession = useCallback(() => {
    if (vaultKey) toast.info("Vault bloqueado");
    if (userEmail) {
      try { localStorage.setItem("gp_last_email", userEmail); } catch {}
    }
    setVaultKey(null);
    setUserSalt(null);
    setUserId(null);
    setUserEmail(null);
    sessionStorage.removeItem("gp_session");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [vaultKey, userEmail]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (vaultKey) {
      timeoutRef.current = setTimeout(clearSession, INACTIVITY_TIMEOUT);
    }
  }, [vaultKey, clearSession]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("gp_session");
    if (saved) {
      const { keyB64, salt, id, email } = JSON.parse(saved);
      const importKeySync = async () => {
        try {
          const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
          const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
          setVaultKey(key);
          setUserSalt(salt);
          setUserId(id);
          setUserEmail(email);
        } catch (e) { sessionStorage.removeItem("gp_session"); }
      };
      importKeySync();
    }
  }, []);

  // NUEVO: Escuchar sincronización desde la extensión
  useEffect(() => {
    const handleExtSync = async (e: MessageEvent) => {
      if (e.data?.type !== "GP_EXT_SYNC") return;
      
      const { keyB64, salt, id, email } = e.data.detail;
      const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
      const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      setVaultKey(key);
      setUserSalt(salt);
      setUserId(id);
      setUserEmail(email);
      sessionStorage.setItem("gp_session", JSON.stringify({ keyB64, salt, id, email }));
      toast.success("Sincronizado con la extensión");
    };
    window.addEventListener("message", handleExtSync);
    return () => window.removeEventListener("message", handleExtSync);
  }, []);

  const setSession = useCallback(
    async (key: CryptoKey, salt: string, id: string, email: string) => {
      setVaultKey(key);
      setUserSalt(salt);
      setUserId(id);
      setUserEmail(email);

      if (email) {
        try { localStorage.setItem("gp_last_email", email); } catch {}
      }

      // Persist to sessionStorage
      const raw = await crypto.subtle.exportKey("raw", key);
      const keyB64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
      const sessionData = JSON.stringify({ keyB64, salt, id, email });
      sessionStorage.setItem("gp_session", sessionData);

      // Sincronizar con la extensión (vía postMessage para mayor compatibilidad)
      window.postMessage({ type: "GP_SYNC_SESSION", detail: sessionData }, "*");
    },
    []
  );

  return (
    <VaultKeyContext.Provider value={{ vaultKey, userSalt, userId, userEmail, setSession, clearSession }}>
      {children}
    </VaultKeyContext.Provider>
  );
}

export function useVaultKey() {
  const ctx = useContext(VaultKeyContext);
  if (!ctx) throw new Error("useVaultKey must be used inside VaultKeyProvider");
  return ctx;
}

/** Derive+set a new vault key from the master password after login. */
export async function initVaultKey(
  masterPassword: string,
  salt: string,
  id: string,
  email: string,
  setSession: VaultKeyContextValue["setSession"]
) {
  const key = await deriveKey(masterPassword, salt);
  setSession(key, salt, id, email);
  return key;
}
