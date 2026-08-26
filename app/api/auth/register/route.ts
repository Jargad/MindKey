import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, signAccessToken, signRefreshToken, getAuthCookieOptions } from "@/lib/auth";
import { generateSalt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Check duplicate
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Este correo ya está registrado" }, { status: 409 });
    }

    const salt         = generateSalt();
    const passwordHash = await hashPassword(password);

    const [user] = await db.insert(users).values({ email, passwordHash, salt }).returning();

    const accessToken  = await signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = await signRefreshToken(user.id);

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, salt: user.salt, totpEnabled: user.totpEnabled },
    }, { status: 201 });

    res.cookies.set("access_token",  accessToken,  getAuthCookieOptions(15 * 60));
    res.cookies.set("refresh_token", refreshToken, getAuthCookieOptions(30 * 24 * 3600));
    return res;
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
