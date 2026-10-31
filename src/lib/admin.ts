import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function ensureLumaAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@luma.local').trim().toLowerCase();
  let username = (process.env.ADMIN_USERNAME || 'luma_admin').trim().toLowerCase();
  const name = process.env.ADMIN_NAME || 'Luma Admin';

  const byEmail = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (byEmail) {
    return db.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, username: true, email: true, role: true },
    });
  }

  const usernameOwner = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (usernameOwner) username = `luma_admin_${randomBytes(4).toString('hex')}`;

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || randomBytes(48).toString('hex'), 12);
  return db.user.create({
    data: { email, username, name, passwordHash, role: 'ADMIN' },
    select: { id: true, name: true, username: true, email: true, role: true },
  });
}
