'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const session = await api.login({ username, password });
      localStorage.setItem('accessToken', session.accessToken);
      localStorage.setItem('refreshToken', session.refreshToken);
      localStorage.setItem('sessionExpiresAt', session.expiresAt);
      localStorage.setItem('currentUser', JSON.stringify(session.user));
      router.push('/dashboard');
    } catch {
      setErrorMessage('Login gagal. Periksa username dan password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_#bfdbfe_0,_#eff6ff_34%,_#ffffff_80%)] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col justify-center">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-lg shadow-blue-200">
              E
            </span>
            <span>
              <span className="block text-lg font-black leading-none text-ink">
                EduFlow
              </span>
              <span className="mt-1 block text-xs font-semibold text-muted">
                Login Sistem
              </span>
            </span>
          </Link>

          <Link
            className="shrink-0 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black text-brand-700 shadow-sm shadow-blue-100 transition hover:bg-brand-50"
            href="/"
          >
            ← Landing
          </Link>
        </div>

        <section className="rounded-[2rem] border border-blue-100 bg-white/90 p-5 shadow-2xl shadow-blue-100 backdrop-blur">
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
            Login Sistem
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
            Masuk ke EduFlow
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Masuk memakai username atau email. Session aktif selama 24 jam.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Username atau Email
              <input
                autoComplete="username"
                className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600 focus:bg-white"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="herhadi"
                type="text"
                value={username}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Password
              <input
                autoComplete="current-password"
                className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600 focus:bg-white"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 font-semibold text-muted">
                <input className="size-4 accent-brand-600" type="checkbox" />
                Ingat saya
              </label>
              <Link className="font-bold text-brand-700" href="/login">
                Lupa password?
              </Link>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              className="block w-full rounded-2xl bg-brand-600 px-5 py-4 text-center text-sm font-black text-white shadow-xl shadow-blue-200 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading || !username || !password}
              type="submit"
            >
              {isLoading ? 'Masuk...' : 'Masuk Sistem EduFlow'}
            </button>
          </form>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-muted">
          Root awal: username `herhadi`. Setelah masuk, root menentukan siapa
          yang menjadi operator sekolah dan pengelola data.
        </p>
      </div>
    </main>
  );
}
