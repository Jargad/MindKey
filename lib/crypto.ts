/**
 * lib/crypto.ts
 * Zero-knowledge AES-256-GCM encryption using the Web Crypto API.
 * The master password never leaves the client.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 32;   // bytes
const IV_LENGTH = 12;     // bytes (96-bit IV for AES-GCM)

// Helper to create a typed Uint8Array<ArrayBuffer> (required by Web Crypto typings in TS 5.5+)
function makeBuffer(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(length));
}

// ─── Key Derivation ───────────────────────────────────────────────────────────

/** Derive a CryptoKey from the master password + a hex salt using PBKDF2. */
export async function deriveKey(
  masterPassword: string,
  saltHex: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const salt = hexToBytes(saltHex);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/** Generate a cryptographically random hex salt (64 hex chars = 32 bytes). */
export function generateSalt(): string {
  const buf = makeBuffer(SALT_LENGTH);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/** Encrypt a plain-text string. Returns a base64 string: "iv:ciphertext". */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = makeBuffer(IV_LENGTH);
  crypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
  return `${ivB64}:${ctB64}`;
}

/** Decrypt a base64 "iv:ciphertext" string produced by encrypt(). */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const [ivB64, ctB64] = ciphertext.split(":");
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct
  );
  return new TextDecoder().decode(plainBuffer);
}

// ─── Share Key ────────────────────────────────────────────────────────────────

/** Generate a one-off AES-256-GCM key for sharing a single item. */
export async function generateShareKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Export a CryptoKey to a URL-safe base64 string (for the URL #fragment). */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Import a URL-safe base64 string back to a CryptoKey. */
export async function importShareKey(b64: string): Promise<CryptoKey> {
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
  const raw = Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, [
    "decrypt",
  ]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf   = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array<ArrayBuffer>): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
