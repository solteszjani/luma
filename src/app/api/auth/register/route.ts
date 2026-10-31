import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { makeSession } from '@/lib/auth';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'A név legalább 2 karakter legyen.').max(40, 'A név legfeljebb 40 karakter lehet.'),
  username: z.string().trim().min(3, 'A felhasználónév legalább 3 karakter legyen.').max(20, 'A felhasználónév legfeljebb 20 karakter lehet.').regex(/^[a-zA-Z0-9_.]+$/, 'A felhasználónév csak angol betűket, számokat, pontot és aláhúzást tartalmazhat.'),
  email: z.email('Adj meg érvényes e-mail-címet.').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, 'A jelszó legalább 8 karakter legyen.').max(128, 'A jelszó legfeljebb 128 karakter lehet.'),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Az adatbázis-kapcsolat (DATABASE_URL) nincs beállítva.' }, { status: 503 });
    }
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      return NextResponse.json({ error: 'A munkamenet titkos kulcsa (AUTH_SECRET) hiányzik vagy túl rövid.' }, { status: 503 });
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'A kérés formátuma hibás. Frissítsd az oldalt, majd próbáld újra.' }, { status: 400 }); }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Ellenőrizd a megadott adatokat.' }, { status: 400 });
    }

    const { name, username, email, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();
    const exists = await db.user.findFirst({
      where: { OR: [{ email }, { username: normalizedUsername }] },
      select: { id: true, email: true, username: true },
    });
    if (exists) {
      const field = exists.email === email ? 'Ez az e-mail-cím' : 'Ez a felhasználónév';
      return NextResponse.json({ error: `${field} már használatban van.` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // A password mező nem része a Prisma User modellnek; csak a hash kerülhet mentésre.
    const user = await db.user.create({
      data: { name, username: normalizedUsername, email, passwordHash },
      select: { id: true, name: true, username: true },
    });

    const token = await makeSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set('luma_session', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('[auth/register] Registration failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ez az e-mail-cím vagy felhasználónév már használatban van.' }, { status: 409 });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && ['P1000', 'P1001', 'P1002'].includes(String((error as { code?: unknown }).code))) {
      return NextResponse.json({ error: 'Nem érhető el a Neon adatbázis. Ellenőrizd a DATABASE_URL értékét és az adatbázis elérhetőségét.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Szerverhiba történt a regisztráció közben. Ellenőrizd a Vercel Runtime Logs naplót.' }, { status: 500 });
  }
}
