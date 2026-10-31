import { NextRequest, NextResponse } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const id = await currentUserId();
  if (!id) return NextResponse.json({ error: 'Belépés szükséges.' }, { status: 401 });
  const archived = req.nextUrl.searchParams.get('archived') === '1';
  const chats = await db.chat.findMany({
    where: { members: { some: { userId: id, deletedAt: null, archivedAt: archived ? { not: null } : null } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } } } },
      messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ chats: chats.map(c => ({
    ...c, other: c.members.find(m => m.userId !== id)?.user || null,
    lastMessage: c.messages[0] || null,
  })) });
}
