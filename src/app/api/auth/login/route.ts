import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { makeSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const login = typeof body?.login === 'string' ? body.login.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!login || !password) return NextResponse.json({ error: 'Add meg az e-mail-címedet vagy felhasználónevedet és a jelszavadat.' }, { status: 400 });
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: 'A bejelentkezés nincs megfelelően konfigurálva (AUTH_SECRET).' }, { status: 503 });
    const user = await db.user.findFirst({
      where: { OR: [{ email: login }, { username: login }] },
      select: { id: true, name: true, username: true, passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: 'Hibás e-mail-cím/felhasználónév vagy jelszó.' }, { status: 401 });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, username: user.username } });
    response.cookies.set('luma_session', await makeSession(user.id), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('[auth/login] Login failed:', error);
    return NextResponse.json({ error: 'Szerverhiba történt a bejelentkezés közben. Ellenőrizd a Vercel Runtime Logs naplót.' }, { status: 500 });
  }
}
