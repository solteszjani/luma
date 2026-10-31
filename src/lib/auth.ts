import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET_MISSING_OR_TOO_SHORT');
  return new TextEncoder().encode(value);
}

export async function makeSession(userId: string) {
  return new SignJWT({ userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(getSecret());
}

export async function currentUserId() {
  const token = (await cookies()).get('luma_session')?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, getSecret())).payload.userId as string; }
  catch { return null; }
}

export async function requireUser() {
  const id = await currentUserId();
  if (!id) throw new Error('UNAUTHORIZED');
  return id;
}
