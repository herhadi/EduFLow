'use client';

import { useEffect, useState } from 'react';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';
import { UserAvatar } from '../../components/ui/user-avatar';
import { api } from '../../lib/api';

type CurrentUser = {
  email?: string;
  name?: string;
  roles?: string[];
  username?: string | null;
};

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Kelola identitas login, preferensi akun, dan keamanan pengguna."
          eyebrow="Akun"
          title="Profil Pengguna"
        />

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="surface-card rounded-[2rem] p-5">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Identitas
            </p>
            <div className="mt-4 flex items-center gap-4">
              <UserAvatar name={currentUser?.name ?? 'Pengguna EduFlow'} photoUrl={photoUrl} />
              <h2 className="text-2xl font-black text-slate-900">{currentUser?.name ?? 'Pengguna EduFlow'}</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              <p>Username: {currentUser?.username ?? '-'}</p>
              <p>Email: {currentUser?.email ?? '-'}</p>
              <p>Role: {currentUser?.roles?.join(', ') ?? '-'}</p>
            </div>
            {isTeacher ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <label className="grid gap-2 text-sm font-bold">URL Foto Profil
                  <input className="rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://.../foto-guru.jpg" type="url" value={photoUrl} />
                </label>
                <label className="mt-3 grid gap-2 text-sm font-bold">Telegram ID
                  <input className="rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" onChange={(event) => setTelegramId(event.target.value)} placeholder="Diisi oleh guru setelah menghubungkan Telegram" value={telegramId} />
                </label>
                <button className="mt-3 rounded-xl bg-brand-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50" disabled={saving} onClick={async () => { setSaving(true); try { await api.updateMyTeacherProfile({ photoUrl, telegramId }); } finally { setSaving(false); } }} type="button">{saving ? 'Menyimpan...' : 'Simpan Profil'}</button>
              </div>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Keamanan
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Password & Session
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Berikutnya area ini dipakai untuk ganti password, melihat session
              aktif, dan logout dari perangkat lain.
            </p>
          </div>
        </section>
      </Container>
    </main>
  );
}
