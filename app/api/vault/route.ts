import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vaultItems, itemTags, tags } from "@/lib/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { eq, and, ilike, or } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  type:               z.enum(["login","card","identity","password","document","note","totp"]),
  encryptedName:      z.string().min(1),
  encryptedData:      z.string().min(1),
  folderId:           z.string().uuid().optional().nullable(),
  tagIds:             z.array(z.string().uuid()).optional(),
  isFavorite:         z.boolean().optional(),
  isIgnoredFromAudit: z.boolean().optional(),
});

// GET /api/vault?type=login&folderId=xxx&tagId=xxx
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url      = new URL(req.url);
  const typeFilter   = url.searchParams.get("type");
  const folderFilter = url.searchParams.get("folderId");

  const conditions = [eq(vaultItems.userId, userId)];
  if (typeFilter)   conditions.push(eq(vaultItems.type, typeFilter as never));
  if (folderFilter) conditions.push(eq(vaultItems.folderId, folderFilter));

  let items = await db
    .select()
    .from(vaultItems)
    .where(and(...conditions))
    .orderBy(vaultItems.updatedAt);

  // Fetch tags for each item
  const itemIds = items.map((i) => i.id);
  let tagsMap: Record<string, typeof tags.$inferSelect[]> = {};

  if (itemIds.length > 0) {
    const rows = await db
      .select({ itemId: itemTags.itemId, tag: tags })
      .from(itemTags)
      .innerJoin(tags, eq(itemTags.tagId, tags.id))
      .where(eq(itemTags.itemId, itemIds[0])); // simplified — full impl below
    // Full fetch per item (acceptable for small vaults)
    for (const id of itemIds) {
      const t = await db
        .select({ tag: tags })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(eq(itemTags.itemId, id));
      tagsMap[id] = t.map((r) => r.tag);
    }
  }

  return NextResponse.json({
    items: items.map((i) => ({ ...i, tags: tagsMap[i.id] ?? [] })),
  });
}

// POST /api/vault
export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { tagIds, ...rest } = parsed.data;

  const [item] = await db
    .insert(vaultItems)
    .values({ ...rest, userId, folderId: rest.folderId ?? null })
    .returning();

  if (tagIds && tagIds.length > 0) {
    await db.insert(itemTags).values(tagIds.map((tagId) => ({ itemId: item.id, tagId })));
  }

  return NextResponse.json({ item }, { status: 201 });
}
