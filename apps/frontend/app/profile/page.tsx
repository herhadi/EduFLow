'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';
import { UserAvatar } from '../../components/ui/user-avatar';
import { api, type AuthSession } from '../../lib/api';
import { clearBrowserSession } from '../../lib/session';

type CurrentUser = {
  email?: string;
  name?: string;
  roles?: string[];
  username?: string | null;
};

type Status = { tone: 'success' | 'error' | 'info'; text: string } | null;

const telegramBotUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? '';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    repeatPassword: '',
  });

  const activeSessions = useMemo(
    () => sessions.filter((session) => !session.revokedAt && new Date(session.expiresAt) > new Date()),
    [sessions],
  );

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser) as CurrentUser;
      setCurrentUser(user);
      if (user.roles?.some((role) => role === 'guru' || role === 'wali_kelas')) {
        setIsTeacher(true);
        void api.getMyTeacherProfile().then((response) => {
          setPhotoUrl(response.data.photoUrl ?? '');
          setTelegramId(response.data.telegramId ?? '');
        }).catch(() => undefined);
      }
    } catch {
      localStorage.removeItem('currentUser');
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const response = await api.getSessions();
      setSessions(response.data);
    } catch {
      setSessions([]);
    }
  }

  async function handlePhotoUpload(file?: File | null) {
    if (!file) {
      return;
    }

    setSavingPhoto(true);
    setStatus(null);
    try {
      const response = await api.uploadMyTeacherProfilePhoto(file);
      setPhotoUrl(response.data.photoUrl ?? '');
      setStatus({ tone: 'success', text: 'Foto profil berhasil diperbarui.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Foto profil gagal diunggah.',
      });
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handlePasswordChange() {
    setSavingPassword(true);
    setStatus(null);
    try {
      await api.changePassword(passwordForm);
      setStatus({ tone: 'success', text: 'Password berhasil diganti. Silakan login ulang.' });
      clearBrowserSession();
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Password gagal diganti.',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleRevokeOtherSessions() {
    setRevoking(true);
    setStatus(null);
    try {
      await api.revokeSessions();
      await loadSessions();
      setStatus({ tone: 'success', text: 'Semua sesi dicabut. Silakan login ulang.' });
      clearBrowserSession();
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Sesi gagal dicabut.',
      });
    } finally {
      setRevoking(false);
    }
  }

  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Kelola identitas login, foto profil, integrasi notifikasi, dan keamanan akun."
          eyebrow="Akun"
          title="Profil Pengguna"
        />

        {status ? (
          <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
            status.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : status.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
          >
            {status.text}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="surface-card rounded-[2rem] p-5">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Identitas
            </p>
            <div className="mt-4 flex items-center gap-4">
              <UserAvatar className="size-20" name={currentUser?.name ?? 'Pengguna EduFlow'} photoUrl={photoUrl} />
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-black text-slate-900">
                  {currentUser?.name ?? 'Pengguna EduFlow'}
                </h2>
                <p className="mt-1 truncate text-sm font-semibold text-muted">
                  {currentUser?.username ?? '-'} · {currentUser?.roles?.join(', ') ?? '-'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              <p>Username: {currentUser?.username ?? '-'}</p>
              <p>Email: {currentUser?.email ?? '-'}</p>
              <p>Role: {currentUser?.roles?.join(', ') ?? '-'}</p>
            </div>

            {isTeacher ? (
              <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-sm font-black text-slate-900">Foto Profil</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                    Pilih foto dari perangkat admin/guru. Format JPEG, PNG, atau WebP maksimal 2 MB.
                  </p>
                  <label className="mt-3 inline-flex cursor-pointer rounded-2xl bg-brand-600 px-4 py-3 text-xs font-black text-white transition hover:bg-brand-700">
                    {savingPhoto ? 'Mengunggah...' : 'Pilih Foto Lokal'}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={savingPhoto}
                      onChange={(event) => void handlePhotoUpload(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">Telegram</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                    {telegramId
                      ? `Terhubung dengan Telegram ID ${telegramId}.`
                      : 'Belum terhubung. Aktivasi dilakukan dari bot agar ID tersimpan otomatis, bukan diketik manual.'}
                  </p>
                  {telegramId ? (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      Aktif
                    </span>
                  ) : (
                    <button
                      className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-black text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!telegramBotUrl}
                      onClick={() => {
                        if (telegramBotUrl) window.open(telegramBotUrl, '_blank', 'noopener,noreferrer');
                        else setStatus({ tone: 'info', text: 'Link bot Telegram belum dikonfigurasi di NEXT_PUBLIC_TELEGRAM_BOT_URL.' });
                      }}
                      type="button"
                    >
                      Aktivasi Telegram
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
              <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
                Keamanan
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Ubah Sandi
              </h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-600"
                  onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  placeholder="Password lama"
                  type="password"
                  value={passwordForm.currentPassword}
                />
                <input
                  className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-600"
                  onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  placeholder="Password baru, 6-10 karakter"
                  type="password"
                  value={passwordForm.newPassword}
                />
                <input
                  className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-600"
                  onChange={(event) => setPasswordForm((current) => ({ ...current, repeatPassword: event.target.value }))}
                  placeholder="Ulangi password baru"
                  type="password"
                  value={passwordForm.repeatPassword}
                />
                <button
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.repeatPassword}
                  onClick={() => void handlePasswordChange()}
                  type="button"
                >
                  {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
              <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
                Session
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Perangkat Aktif
              </h2>
              <p className="mt-2 text-sm font-semibold text-muted">
                {activeSessions.length} sesi aktif dari {sessions.length} sesi tercatat.
              </p>
              <div className="mt-4 max-h-52 space-y-2 overflow-auto pr-1">
                {sessions.slice(0, 6).map((session) => (
                  <div className="rounded-2xl border border-slate-100 p-3 text-xs font-semibold text-muted" key={session.id}>
                    <p className="font-black text-slate-800">
                      {session.revokedAt ? 'Dicabut' : 'Aktif'} · {new Date(session.createdAt).toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1">Berakhir: {new Date(session.expiresAt).toLocaleString('id-ID')}</p>
                    {session.revokedReason ? <p className="mt-1">Alasan: {session.revokedReason}</p> : null}
                  </div>
                ))}
              </div>
              <button
                className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 disabled:opacity-50"
                disabled={revoking}
                onClick={() => void handleRevokeOtherSessions()}
                type="button"
              >
                {revoking ? 'Mencabut...' : 'Keluar dari Semua Perangkat'}
              </button>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
