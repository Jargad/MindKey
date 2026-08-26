import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  name:  z.string().min(1),
  color: z.string().optional().default("#6366f1"),
});

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(tags.name);
  return NextResponse.json({ tags: rows });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const [tag] = await db.insert(tags).values({ ...parsed.data, userId }).returning();
  return NextResponse.json({ tag }, { status: 201 });
}

export async function DELETE(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
  return NextResponse.json({ ok: true });
}
