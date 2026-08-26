import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shareTokens } from "@/lib/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET /api/share/[token]  — public, returns encrypted blob only
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [row] = await db.select().from(shareTokens)
    .where(and(eq(shareTokens.id, token), eq(shareTokens.isActive, true)));

  if (!row) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 404 });

  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    await db.update(shareTokens).set({ isActive: false }).where(eq(shareTokens.id, token));
    return NextResponse.json({ error: "Link expirado" }, { status: 410 });
  }

  // Increment access counter
  await db.update(shareTokens)
    .set({ accessCount: row.accessCount + 1 })
    .where(eq(shareTokens.id, token));

  return NextResponse.json({
    encryptedBlob: row.encryptedBlob,
    expiresAt:     row.expiresAt,
    accessCount:   row.accessCount + 1,
  });
}

// DELETE /api/share/[token]  — revoke (owner only)
export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { token } = await params;

  await db.update(shareTokens)
    .set({ isActive: false })
    .where(and(eq(shareTokens.id, token), eq(shareTokens.userId, userId)));

  return NextResponse.json({ ok: true });
}
