import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { makeSession } from '@/lib/auth';
import { ensureLumaAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'A név legalább 2 karakter legyen.').max(40, 'A név legfeljebb 40 karakter lehet.'),
  username: z.string().trim().min(3, 'A felhasználónév legalább 3 karakter legyen.').max(20, 'A felhasználónév legfeljebb 20 karakter lehet.').regex(/^[a-zA-Z0-9_.]+$/, 'A felhasználónév csak angol betűket, számokat, pontot és aláhúzást tartalmazhat.'),
  email: z.string().trim().email('Adj meg érvényes e-mail-címet.').transform(v => v.toLowerCase()),
  password: z.string().min(8, 'A jelszó legalább 8 karakter legyen.').max(128, 'A jelszó legfeljebb 128 karakter lehet.'),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A DATABASE_URL nincs beállítva.' }, { status: 503 });
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: 'Az AUTH_SECRET hiányzik vagy túl rövid.' }, { status: 503 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Ellenőrizd a megadott adatokat.' }, { status: 400 });

    const { name, username, email, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();
    const exists = await db.user.findFirst({ where: { OR: [{ email }, { username: normalizedUsername }] }, select: { email: true, username: true } });
    if (exists) return NextResponse.json({ error: exists.email === email ? 'Ez az e-mail-cím már használatban van.' : 'Ez a felhasználónév már használatban van.' }, { status: 409 });

    const admin = await ensureLumaAdmin();
    if (admin.email === email || admin.username === normalizedUsername) {
      return NextResponse.json({ error: 'Ez az e-mail-cím vagy felhasználónév foglalt.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.$transaction(async tx => {
      const created = await tx.user.create({
        data: { name, username: normalizedUsername, email, passwordHash },
        select: { id: true, name: true, username: true },
      });
      const chat = await tx.chat.create({
        data: {
          isGroup: false,
          members: { create: [{ userId: admin.id }, { userId: created.id }] },
        },
      });
      await tx.message.create({
        data: {
          chatId: chat.id,
          senderId: admin.id,
          type: 'TEXT',
          content: process.env.WELCOME_MESSAGE || `Szia ${name}! 👋 Üdvözlünk a Lumában! Örülünk, hogy csatlakoztál. Itt tudsz üzenetet küldeni az ismerőseidnek, csoportokat létrehozni és megosztani a pillanataidat. Jó beszélgetést!`,
        },
      });
      return created;
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set('luma_session', await makeSession(user.id), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('[auth/register] Registration failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ez az e-mail-cím vagy felhasználónév már használatban van.' }, { status: 409 });
    }
    const code = typeof error === 'object' && error && 'code' in error ? String((error as {code:unknown}).code) : '';
    if (['P1000','P1001','P1002'].includes(code)) return NextResponse.json({ error: 'Nem érhető el a Neon adatbázis. Ellenőrizd a DATABASE_URL értékét.' }, { status: 503 });
    return NextResponse.json({ error: 'Szerverhiba történt a regisztráció közben. Ellenőrizd a Vercel Runtime Logs naplót.' }, { status: 500 });
  }
}
