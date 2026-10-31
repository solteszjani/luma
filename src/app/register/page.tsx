'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type RegisterForm = { name: string; username: string; email: string; password: string };

export default function Register() {
  const [form, setForm] = useState<RegisterForm>({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function change(key: keyof RegisterForm, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || `A regisztráció nem sikerült (HTTP ${response.status}).`);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Nem sikerült kapcsolódni a szerverhez. Próbáld újra néhány perc múlva.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="brand" style={{ color: 'white' }}><span className="brand-mark">L</span><span>Luma</span></div>
        <h1>Új kapcsolatok. Közös történetek.</h1>
        <p>Hozd össze a barátaidat, és legyen egy hely, ahol minden fontos beszélgetésed otthonra talál.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <h2>Csatlakozz a Lumához</h2>
        <p>Készítsd el ingyenes fiókodat.</p>
        <div className="field"><label htmlFor="register-name">Teljes név</label><input id="register-name" type="text" autoComplete="name" value={form.name} onChange={(event) => change('name', event.target.value)} required minLength={2} maxLength={40} /></div>
        <div className="field"><label htmlFor="register-username">Felhasználónév</label><input id="register-username" type="text" autoComplete="username" value={form.username} onChange={(event) => change('username', event.target.value)} required minLength={3} maxLength={20} pattern="[A-Za-z0-9_.]+" /></div>
        <div className="field"><label htmlFor="register-email">E-mail cím</label><input id="register-email" type="email" autoComplete="email" value={form.email} onChange={(event) => change('email', event.target.value)} required maxLength={254} /></div>
        <div className="field"><label htmlFor="register-password">Jelszó (min. 8 karakter)</label><input id="register-password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => change('password', event.target.value)} required minLength={8} maxLength={128} /></div>
        {error && <div className="notice" role="alert">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Fiók létrehozása…' : 'Regisztráció'}</button>
        <p style={{ marginTop: 24, textAlign: 'center' }}>Van már fiókod? <Link href="/login" style={{ color: '#6656f1', fontWeight: 700 }}>Belépés</Link></p>
      </form>
    </main>
  );
}
