import { NextRequest, NextResponse } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { db } from '@/lib/db';

type Context = { params: Promise<{ chatId: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Belépés szükséges.' }, { status: 401 });
  const { chatId } = await params;
  const body = await req.json().catch(() => ({}));
  const member = await db.chatMember.findFirst({ where: { chatId, userId, deletedAt: null } });
  if (!member) return NextResponse.json({ error: 'A beszélgetés nem található.' }, { status: 404 });

  if (body.action === 'archive') {
    await db.chatMember.update({ where: { id: member.id }, data: { archivedAt: body.value ? new Date() : null } });
  } else if (body.action === 'mute') {
    const minutes = Number(body.minutes);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 525600) return NextResponse.json({ error: 'Érvénytelen némítási idő.' }, { status: 400 });
    await db.chatMember.update({ where: { id: member.id }, data: { mutedUntil: minutes === 0 ? null : new Date(Date.now() + minutes * 60_000) } });
  } else {
    return NextResponse.json({ error: 'Ismeretlen művelet.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Belépés szükséges.' }, { status: 401 });
  const { chatId } = await params;
  const member = await db.chatMember.findFirst({ where: { chatId, userId, deletedAt: null } });
  if (!member) return NextResponse.json({ error: 'A beszélgetés nem található.' }, { status: 404 });
  await db.chatMember.update({ where: { id: member.id }, data: { deletedAt: new Date(), archivedAt: null } });
  return NextResponse.json({ ok: true });
}
