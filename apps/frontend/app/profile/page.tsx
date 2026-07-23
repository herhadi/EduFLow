'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';
import { UserAvatar } from '../../components/ui/user-avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { SurfaceCard } from '../../components/ui/card';
import { fieldClass } from '../../components/ui/form';
import { api, type AuthSession, type MyProfile } from '../../lib/api';
import { formatImageSize, prepareProfilePhotoForUpload } from '../../lib/image-compression';
import { clearBrowserSession } from '../../lib/session';

type Status = { tone: 'success' | 'error' | 'info'; text: string } | null;

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<MyProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [currentRefreshTokenHash, setCurrentRefreshTokenHash] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [photoUploadInfo, setPhotoUploadInfo] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
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
    void loadProfile();
  }, []);

  useEffect(() => {
    void loadSessions();
    void loadCurrentRefreshTokenHash();
  }, []);

  async function loadSessions() {
    try {
      const response = await api.getSessions();
      setSessions(response.data);
    } catch {
      setSessions([]);
    }
  }

  async function loadCurrentRefreshTokenHash() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || !crypto.subtle) return;

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(refreshToken));
    setCurrentRefreshTokenHash(
      [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    );
  }

  async function loadProfile() {
    try {
      const response = await api.getMyProfile();
      setCurrentUser(response.data);
      setPhotoUrl(response.data.photoUrl ?? '');
      setTelegramId(response.data.telegramId ?? '');
      saveProfileToSession(response.data);
    } catch {
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) return;
      try {
        const user = JSON.parse(storedUser) as MyProfile;
        setCurrentUser(user);
        setPhotoUrl(user.photoUrl ?? '');
        setTelegramId(user.telegramId ?? '');
      } catch {
        localStorage.removeItem('currentUser');
      }
    }
  }

  async function handlePhotoUpload(file?: File | null) {
    if (!file) {
      return;
    }

    setSavingPhoto(true);
    setStatus(null);
    setPhotoUploadInfo('');
    try {
      const prepared = await prepareProfilePhotoForUpload(file);
      const response = await api.uploadMyProfilePhoto(prepared);
      setCurrentUser(response.data);
      setPhotoUrl(response.data.photoUrl ?? '');
      saveProfileToSession(response.data);
      setPhotoUploadInfo(
        prepared.size < file.size
          ? `Dikompresi dari ${formatImageSize(file.size)} menjadi ${formatImageSize(prepared.size)}.`
          : `Ukuran foto ${formatImageSize(prepared.size)}.`,
      );
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

  function saveProfileToSession(profile: MyProfile) {
    const storedUser = localStorage.getItem('currentUser');
    const existingUser = storedUser ? JSON.parse(storedUser) as Record<string, unknown> : {};
    localStorage.setItem('currentUser', JSON.stringify({ ...existingUser, ...profile }));
  }

  async function handleTelegramActivation() {
    setLinkingTelegram(true);
    setStatus(null);
    try {
      const response = await api.createTelegramLinkToken();
      if (!response.data.botUrl) {
        setStatus({
          tone: 'info',
          text: 'Bot Telegram belum dikonfigurasi. Isi TELEGRAM_BOT_URL atau TELEGRAM_BOT_USERNAME di backend.',
        });
        return;
      }

      window.open(response.data.botUrl, '_blank', 'noopener,noreferrer');
      setStatus({
        tone: 'info',
        text: telegramId
          ? 'Telegram dibuka. Klik Start di bot untuk mengganti akun Telegram, lalu refresh status profil.'
          : 'Telegram dibuka. Setelah klik Start di bot, kembali ke halaman ini dan refresh status profil.',
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Token aktivasi Telegram gagal dibuat.',
      });
    } finally {
      setLinkingTelegram(false);
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
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100'
              : status.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100'
                : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100'
          }`}
          >
            {status.text}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <SurfaceCard>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Identitas
            </p>
            <div className="mt-4 flex items-center gap-4">
              <UserAvatar className="size-20" name={currentUser?.name ?? 'Pengguna EduFlow'} photoUrl={photoUrl} />
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-black text-slate-900 dark:text-slate-100">
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

            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">Foto Profil</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                  Pilih foto dari perangkat lokal. Format JPEG, PNG, atau WebP. Foto dikompresi otomatis sebelum upload.
                </p>
                <label className="mt-3 inline-flex cursor-pointer rounded-2xl bg-brand-600 px-4 py-3 text-xs font-black text-white transition hover:bg-brand-700">
                  {savingPhoto ? 'Mengunggah...' : 'Pilih Foto Lokal'}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={savingPhoto}
                    onChange={(event) => {
                      void handlePhotoUpload(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                    type="file"
                  />
                </label>
                {photoUploadInfo ? (
                  <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100">
                    {photoUploadInfo}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-blue-400/20 dark:bg-slate-950">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">Telegram</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                  {telegramId
                    ? `Terhubung dengan Telegram ID ${telegramId}. Jika ingin memakai akun Telegram lain, klik tombol ganti akun lalu tekan Start di bot.`
                    : 'Belum terhubung. Aktivasi dilakukan dari bot agar ID tersimpan otomatis, bukan diketik manual.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {telegramId ? (
                    <Badge tone="success">
                      Aktif
                    </Badge>
                  ) : null}
                  <Button
                    disabled={linkingTelegram}
                    onClick={() => void handleTelegramActivation()}
                    size="sm"
                    variant="outline"
                  >
                    {linkingTelegram
                      ? 'Membuat Token...'
                      : telegramId
                        ? 'Ganti Akun Telegram'
                        : 'Aktivasi Telegram'}
                  </Button>
                  <Button
                    onClick={() => void loadProfile()}
                    size="sm"
                    variant="outline"
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            </div>
          </SurfaceCard>

          <div className="space-y-4">
            <SurfaceCard>
              <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
                Keamanan
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                Ubah Sandi
              </h2>
              <div className="mt-4 grid gap-3">
                <input
                  className={fieldClass}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  placeholder="Password lama"
                  type="password"
                  value={passwordForm.currentPassword}
                />
                <input
                  className={fieldClass}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  placeholder="Password baru, 6-10 karakter"
                  type="password"
                  value={passwordForm.newPassword}
                />
                <input
                  className={fieldClass}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, repeatPassword: event.target.value }))}
                  placeholder="Ulangi password baru"
                  type="password"
                  value={passwordForm.repeatPassword}
                />
                <Button
                  disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.repeatPassword}
                  onClick={() => void handlePasswordChange()}
                  variant="primary"
                >
                  {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
                </Button>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
                Session
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                Perangkat Aktif
              </h2>
              <p className="mt-2 text-sm font-semibold text-muted">
                {activeSessions.length} sesi aktif dari {sessions.length} sesi tercatat.
              </p>
              <div className="mt-4 max-h-52 space-y-2 overflow-auto pr-1">
                {sessions.slice(0, 6).map((session) => (
                  <div className="rounded-2xl border border-slate-100 p-3 text-xs font-semibold text-muted dark:border-slate-700 dark:bg-slate-950" key={session.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800 dark:text-slate-100">
                        {getSessionDeviceLabel(session.userAgent)}
                      </p>
                      {session.tokenHash === currentRefreshTokenHash ? (
                        <Badge tone="success">
                          Aktif saat ini
                        </Badge>
                      ) : (
                        <span className={`rounded-full px-2 py-1 text-[0.65rem] font-black ${
                          session.revokedAt
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-blue-50 text-brand-700 dark:bg-blue-500/15 dark:text-blue-100'
                        }`}
                        >
                          {session.revokedAt ? 'Dicabut' : 'Aktif'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1">Masuk: {new Date(session.createdAt).toLocaleString('id-ID')}</p>
                    <p className="mt-1">IP: {session.ipAddress ?? '-'}</p>
                    <p className="mt-1">Berakhir: {new Date(session.expiresAt).toLocaleString('id-ID')}</p>
                    {session.revokedReason ? <p className="mt-1">Alasan: {session.revokedReason}</p> : null}
                  </div>
                ))}
              </div>
              <Button
                className="mt-4 border-rose-200 text-rose-700 hover:border-rose-300 hover:text-rose-700 dark:border-rose-400/30 dark:text-rose-100"
                disabled={revoking}
                onClick={() => void handleRevokeOtherSessions()}
                variant="outline"
              >
                {revoking ? 'Mencabut...' : 'Keluar dari Semua Perangkat'}
              </Button>
            </SurfaceCard>
          </div>
        </section>
      </Container>
    </main>
  );
}

function getSessionDeviceLabel(userAgent?: string | null) {
  if (!userAgent) return 'Perangkat tidak dikenal';

  const browser = userAgent.includes('Edg/')
    ? 'Edge'
    : userAgent.includes('Chrome/')
      ? 'Chrome'
      : userAgent.includes('Safari/') && !userAgent.includes('Chrome/')
        ? 'Safari'
        : userAgent.includes('Firefox/')
          ? 'Firefox'
          : 'Browser';
  const device = /Android/i.test(userAgent)
    ? 'Android'
    : /iPhone|iPad/i.test(userAgent)
      ? 'iOS'
      : /Macintosh|Mac OS X/i.test(userAgent)
        ? 'Mac'
        : /Windows/i.test(userAgent)
          ? 'Windows'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Perangkat';

  return `${browser} di ${device}`;
}
