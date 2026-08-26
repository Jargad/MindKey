/**
 * lib/totp.ts
 * TOTP code generation (RFC 6238) using the otpauth library.
 */
import { TOTP } from "otpauth";

export interface TotpItem {
  secret: string;    // base32 secret
  label: string;
  issuer: string;
  digits?: number;
  period?: number;
}

/** Generate the current TOTP code for a stored secret. */
export function generateTotpCode(item: TotpItem): string {
  const totp = new TOTP({
    issuer: item.issuer,
    label: item.label,
    algorithm: "SHA1",
    digits: item.digits ?? 6,
    period: item.period ?? 30,
    secret: item.secret,
  });
  return totp.generate();
}

/** Returns seconds remaining in the current TOTP window. */
export function getTotpTimeRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

/** Build a valid otpauth:// URI for QR code generation. */
export function buildOtpAuthUri(item: TotpItem): string {
  const totp = new TOTP({
    issuer: item.issuer,
    label: item.label,
    algorithm: "SHA1",
    digits: item.digits ?? 6,
    period: item.period ?? 30,
    secret: item.secret,
  });
  return totp.toString();
}
