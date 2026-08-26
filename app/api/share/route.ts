import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shareTokens, vaultItems } from "@/lib/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const schema = z.object({
  itemId:        z.string().uuid(),
  encryptedBlob: z.string().min(1),
  expiresIn:     z.enum(["1h","24h","7d","unlimited"]),
});

function calcExpiry(val: string): Date | null {
  if (val === "unlimited") return null;
  const ms = val === "1h" ? 3600000 : val === "24h" ? 86400000 : 604800000;
  return new Date(Date.now() + ms);
}

// POST /api/share  — create share token
export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { itemId, encryptedBlob, expiresIn } = parsed.data;

  // Verify item belongs to user
  const [item] = await db.select().from(vaultItems)
    .where(and(eq(vaultItems.id, itemId), eq(vaultItems.userId, userId)));
  if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

  const [token] = await db.insert(shareTokens).values({
    itemId,
    userId,
    encryptedBlob,
    expiresAt: calcExpiry(expiresIn),
  }).returning();

  return NextResponse.json({ token }, { status: 201 });
}

// GET /api/share  — list active share tokens for user
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tokens = await db.select().from(shareTokens)
    .where(and(eq(shareTokens.userId, userId), eq(shareTokens.isActive, true)))
    .orderBy(shareTokens.createdAt);
  return NextResponse.json({ tokens });
}
