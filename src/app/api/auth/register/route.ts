import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { makeSession } from '@/lib/auth';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'A név legalább 2 karakter legyen.').max(40, 'A név legfeljebb 40 karakter lehet.'),
  username: z.string().trim().min(3, 'A felhasználónév legalább 3 karakter legyen.').max(20, 'A felhasználónév legfeljebb 20 karakter lehet.').regex(/^[a-zA-Z0-9_.]+$/, 'A felhasználónév csak betűket, számokat, pontot és aláhúzást tartalmazhat.'),
  email: z.string().trim().email('Adj meg egy érvényes e-mail-címet.').max(254),
  password: z.string().min(8, 'A jelszó legalább 8 karakter legyen.').max(128, 'A jelszó legfeljebb 128 karakter lehet.'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérésformátum.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Ellenőrizd a megadott adatokat.' }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const username = data.username.toLowerCase();

  try {
    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true, email: true, username: true },
    });
    if (existing) {
      const field = existing.email === email ? 'E-mail-cím' : 'Felhasználónév';
      return NextResponse.json({ error: `Ez a ${field.toLowerCase()} már foglalt.` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await db.user.create({
      data: { name: data.name, username, email, passwordHash },
      select: { id: true, name: true, username: true },
    });

    const token = await makeSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set('luma_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ez az e-mail-cím vagy felhasználónév már foglalt.' }, { status: 409 });
    }
    console.error('[Luma registration]', error);
    return NextResponse.json(
      { error: 'A regisztrációs szolgáltatás jelenleg nem érhető el. Ellenőrizd a Vercel DATABASE_URL beállítását és a Neon adatbázis kapcsolatát.' },
      { status: 503 },
    );
  }
}
