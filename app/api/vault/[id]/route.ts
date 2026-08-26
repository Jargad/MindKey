import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vaultItems, itemTags } from "@/lib/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  encryptedName: z.string().min(1).optional(),
  encryptedData: z.string().min(1).optional(),
  folderId:      z.string().uuid().nullable().optional(),
  tagIds:        z.array(z.string().uuid()).optional(),
  isFavorite:    z.boolean().optional(),
});

// GET /api/vault/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const [item] = await db
    .select()
    .from(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId)));

  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ item });
}

// PATCH /api/vault/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { tagIds, ...rest } = parsed.data;

  const [item] = await db
    .update(vaultItems)
    .set({ ...rest, updatedAt: new Date() })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId)))
    .returning();

  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (tagIds !== undefined) {
    await db.delete(itemTags).where(eq(itemTags.itemId, id));
    if (tagIds.length > 0) {
      await db.insert(itemTags).values(tagIds.map((tagId) => ({ itemId: id, tagId })));
    }
  }

  return NextResponse.json({ item });
}

// DELETE /api/vault/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await db.delete(vaultItems).where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId)));
  return NextResponse.json({ ok: true });
}
