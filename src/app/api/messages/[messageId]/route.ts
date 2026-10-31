import { NextRequest, NextResponse } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { db } from '@/lib/db';

type Context = { params: Promise<{ messageId: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Belépés szükséges.' }, { status: 401 });
  const { messageId } = await params;
  const { content } = await req.json().catch(() => ({}));
  if (typeof content !== 'string' || !content.trim() || content.length > 5000) {
    return NextResponse.json({ error: 'Az üzenet 1–5000 karakter lehet.' }, { status: 400 });
  }
  const message = await db.message.findUnique({ where: { id: messageId }, include: { chat: { include: { members: true } } } });
  if (!message || message.deletedAt || !message.chat.members.some(m => m.userId === userId && !m.deletedAt)) {
    return NextResponse.json({ error: 'Az üzenet nem található.' }, { status: 404 });
  }
  if (message.senderId !== userId) return NextResponse.json({ error: 'Csak a saját üzenetedet módosíthatod.' }, { status: 403 });
  const updated = await db.message.update({
    where: { id: messageId },
    data: { content: content.trim(), editedAt: new Date() },
    include: { sender: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });
  return NextResponse.json({ message: updated });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Belépés szükséges.' }, { status: 401 });
  const { messageId } = await params;
  const message = await db.message.findUnique({ where: { id: messageId }, include: { chat: { include: { members: true } } } });
  if (!message || message.deletedAt || !message.chat.members.some(m => m.userId === userId && !m.deletedAt)) {
    return NextResponse.json({ error: 'Az üzenet nem található.' }, { status: 404 });
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (message.senderId !== userId && user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Csak a saját üzenetedet törölheted.' }, { status: 403 });
  }
  await db.message.update({ where: { id: messageId }, data: { content: 'Az üzenet törölve lett.', type: 'DELETED', deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
