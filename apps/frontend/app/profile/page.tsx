'use client';

import { useEffect, useState } from 'react';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

type CurrentUser = {
  email?: string;
  name?: string;
  roles?: string[];
  username?: string | null;
};

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      return;
    }

    try {
      setCurrentUser(JSON.parse(storedUser));
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
          <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Identitas
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {currentUser?.name ?? 'Pengguna EduFlow'}
            </h2>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              <p>Username: {currentUser?.username ?? '-'}</p>
              <p>Email: {currentUser?.email ?? '-'}</p>
              <p>Role: {currentUser?.roles?.join(', ') ?? '-'}</p>
            </div>
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
