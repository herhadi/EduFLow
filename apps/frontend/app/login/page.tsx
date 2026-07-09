'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { api, type LoginResult } from '../../lib/api';
import { saveSession } from '../../lib/session';
import { PasswordToggleIcon } from '../../components/ui/password-toggle-icon';
import { ThemeToggle } from '../../components/ui/theme-toggle';
import { getDashboardPathForRoles } from '../../lib/navigation.config';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [showForgotPasswordHelp, setShowForgotPasswordHelp] = useState(false);
  const [pendingSession, setPendingSession] = useState<LoginResult | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get('reason') === 'session-expired') {
      setErrorMessage('Session berakhir atau token tidak valid. Silakan login ulang.');
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const formData = new FormData(event.currentTarget);
      const submittedUsername = String(formData.get('username') ?? '').trim();
      const submittedPassword = String(formData.get('password') ?? '');

      if (!submittedUsername || !submittedPassword) {
        setErrorMessage('Username dan password wajib diisi.');
        return;
      }

      const session = await api.login({
        username: submittedUsername,
        password: submittedPassword,
      });
      setUsername(submittedUsername);
      saveSession(session);

      if (session.user.mustChangePassword) {
        setPendingSession(session);
        setPassword('');
        setErrorMessage('');
        return;
      }

      router.push(getDashboardPathForRoles(session.user.roles ?? []));
      router.refresh();
    } catch {
      setErrorMessage('Username atau password salah. Periksa kembali data login Anda.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangeInitialPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingSession) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    const submittedNewPassword = String(formData.get('newPassword') ?? '');
    const submittedRepeatPassword = String(formData.get('repeatPassword') ?? '');

    if (!submittedNewPassword || !submittedRepeatPassword) {
      setIsLoading(false);
      setErrorMessage('Password baru dan konfirmasi wajib diisi.');
      return;
    }

    if (submittedNewPassword !== submittedRepeatPassword) {
      setIsLoading(false);
      setErrorMessage('Konfirmasi password tidak sama.');
      return;
    }

    try {
      const response = await api.changeInitialPassword({
        newPassword: submittedNewPassword,
        repeatPassword: submittedRepeatPassword,
      });
      const nextSession = {
        ...pendingSession,
        user: response.data,
      };

      saveSession(nextSession);
      router.push(getDashboardPathForRoles(response.data.roles ?? []));
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Password baru belum bisa disimpan.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestPasswordReset() {
    const submittedUsername = username.trim();
    setForgotPasswordMessage('');
    setErrorMessage('');

    if (!submittedUsername) {
      setForgotPasswordMessage('Isi username atau email terlebih dahulu.');
      return;
    }

    setIsRequestingReset(true);

    try {
      const response = await api.requestPasswordReset({
        username: submittedUsername,
      });
      setForgotPasswordMessage(response.message);
    } catch (error) {
      setForgotPasswordMessage(
        error instanceof Error
          ? error.message
          : 'Request reset password belum bisa dikirim.',
      );
    } finally {
      setIsRequestingReset(false);
    }
  }

  return (
    <main className="app-backdrop min-h-dvh px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col justify-center">
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-11 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-white p-1">
              <img
                alt="Logo sekolah"
                className="h-full w-full object-contain"
                src="/logo_sekolah.webp"
              />
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

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            <Link className="secondary-button shrink-0 rounded-full px-3 py-2 text-xs font-black sm:px-4" href="/">
              ← Landing
            </Link>
          </div>
        </div>

        <section className="surface-card rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
            {pendingSession ? 'Password Default' : 'Login Sistem'}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
            {pendingSession ? 'Ganti Password' : 'Masuk ke EduFlow'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {pendingSession
              ? 'Akun masih memakai password default. Buat password baru sebelum masuk dashboard.'
              : 'Masuk memakai username atau email. Session aktif selama 24 jam.'}
          </p>

          <form
            className="mt-6 space-y-4"
            noValidate
            onSubmit={pendingSession ? handleChangeInitialPassword : handleSubmit}
          >
            {pendingSession ? null : (
              <>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Username atau Email
                  <input
                    autoComplete="username"
                    className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600 focus:bg-white"
                    name="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder=""
                    type="text"
                    value={username}
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Password
                  <span className="flex overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50 transition focus-within:border-brand-600 focus-within:bg-white">
                    <input
                      autoComplete="current-password"
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-normal outline-none"
                      maxLength={10}
                      minLength={6}
                      name="password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder=""
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="grid place-items-center px-4 text-brand-700"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      <PasswordToggleIcon visible={showPassword} />
                    </button>
                  </span>
                </label>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 font-semibold text-muted">
                    <input className="size-4 accent-brand-600" type="checkbox" />
                    Ingat saya
                  </label>
                  <button
                    className="font-bold text-brand-700"
                    onClick={() => setShowForgotPasswordHelp((current) => !current)}
                    type="button"
                  >
                    Lupa password?
                  </button>
                </div>
              </>
            )}

            {!pendingSession && showForgotPasswordHelp ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm leading-6 text-brand-900">
                <p className="font-black">Reset password lewat operator sekolah.</p>
                <p className="mt-1 font-semibold">
                  Isi username atau email, lalu kirim request. Jika data valid,
                  request akan masuk ke Inbox admin/root untuk ditindaklanjuti.
                </p>
                <button
                  className="mt-3 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={isRequestingReset}
                  onClick={() => void handleRequestPasswordReset()}
                  type="button"
                >
                  {isRequestingReset ? 'Mengirim...' : 'Kirim Request Reset'}
                </button>
                {forgotPasswordMessage ? (
                  <p className="mt-3 rounded-xl bg-white/80 p-3 text-xs font-bold text-brand-800">
                    {forgotPasswordMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            {pendingSession ? (
              <>
                <PasswordField
                  label="Password Baru"
                  name="newPassword"
                  onChange={setNewPassword}
                  value={newPassword}
                />
                <PasswordField
                  label="Ulangi Password Baru"
                  name="repeatPassword"
                  onChange={setRepeatPassword}
                  value={repeatPassword}
                />
              </>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              className="mt-8 block w-full rounded-2xl bg-brand-600 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100 disabled:opacity-70 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              disabled={isLoading}
              type="submit"
            >
              {isLoading
                ? pendingSession
                  ? 'Menyimpan...'
                  : 'Masuk...'
                : pendingSession
                  ? 'Simpan Password & Masuk'
                  : 'Masuk Sistem EduFlow'}
            </button>
          </form>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-muted">
          Ada saran atau ide di halaman inikah? :D
        </p>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <span className="flex overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50 transition focus-within:border-brand-600 focus-within:bg-white">
        <input
          autoComplete="new-password"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-normal outline-none"
          maxLength={10}
          minLength={6}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
          className="grid place-items-center px-4 text-brand-700"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <PasswordToggleIcon visible={visible} />
        </button>
      </span>
    </label>
  );
}
