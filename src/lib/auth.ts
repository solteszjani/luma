import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-only-change-this-secret-before-deploying');
export async function makeSession(userId:string) { return new SignJWT({userId}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('30d').sign(secret); }
export async function currentUserId() {
 const token = (await cookies()).get('luma_session')?.value;
 if (!token) return null;
 try { return (await jwtVerify(token,secret)).payload.userId as string; } catch { return null; }
}
export async function requireUser() { const id=await currentUserId(); if(!id) throw new Error('UNAUTHORIZED'); return id; }
