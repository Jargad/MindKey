/**
 * lib/auth.ts
 * JWT + session helpers (server-side only).
 */
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_SECRET!);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);
const ACCESS_TTL  = "15m";
const REFRESH_TTL = "30d";

export interface JWTPayload {
  sub: string;   // user id
  email: string;
}

// ─── Access Token ─────────────────────────────────────────────────────────────

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_TTL)
    .setIssuedAt()
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return payload as unknown as JWTPayload;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_TTL)
    .setIssuedAt()
    .sign(REFRESH_SECRET);
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return payload as unknown as { sub: string };
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// ─── Request → UserId ─────────────────────────────────────────────────────────

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    const cookie = req.headers.get("cookie") ?? "";
    const match  = cookie.match(/access_token=([^;]+)/);
    if (!match) return null;
    const payload = await verifyAccessToken(match[1]);
    return payload.sub;
  } catch {
    return null;
  }
}
