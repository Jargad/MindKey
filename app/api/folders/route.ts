import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { folders } from "@/lib/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  encryptedName: z.string().min(1),
  parentId:      z.string().uuid().nullable().optional(),
  icon:          z.string().optional().default("folder"),
  color:         z.string().optional().default("#6366f1"),
});

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await db.select().from(folders).where(eq(folders.userId, userId)).orderBy(folders.createdAt);
  return NextResponse.json({ folders: rows });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const [folder] = await db.insert(folders).values({ ...parsed.data, userId, parentId: parsed.data.parentId ?? null }).returning();
  return NextResponse.json({ folder }, { status: 201 });
}

export async function DELETE(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
  return NextResponse.json({ ok: true });
}
