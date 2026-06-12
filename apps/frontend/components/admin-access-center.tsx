'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type AppUser, type Teacher } from '../lib/api';
import { useToast } from './ui/toast';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type ActionState = 'idle' | 'loading' | 'success' | 'error';

const roleCards = [
  {
    role: 'root',
    label: 'Root',
    description: 'Akses teknis semua fitur untuk owner/dev/super admin. Tidak dipakai operasional harian.',
    permissions: ['Semua permission', 'Recovery sistem', 'Kelola user dan role'],
  },
  {
    role: 'operator_sekolah',
    label: 'Operator Sekolah',
    description: 'Actor utama untuk kalender pendidikan, jadwal, master akademik, import, dan generate agenda.',
    permissions: ['academic.manage', 'academic-calendar.manage', 'schedule.manage', 'agenda.generate'],
  },
  {
    role: 'kepala_sekolah',
    label: 'Kepala Sekolah',
    description: 'Monitoring sekolah, review perangkat ajar, approval nilai semester, dan audit terbatas.',
    permissions: ['teaching-plan.review', 'student-grade.approve', 'reporting.read', 'audit.read'],
  },
  {
    role: 'guru',
    label: 'Guru',
    description: 'Mengajar, submit presensi, upload perangkat ajar, dan input nilai siswa sesuai mapel/kelas.',
    permissions: ['attendance.manage', 'teaching-plan.manage', 'student-grade.manage'],
  },
  {
    role: 'wali_kelas',
    label: 'Wali Kelas',
    description: 'Memantau kelas binaan, presensi, ringkasan siswa, dan laporan kelas.',
    permissions: ['attendance.read', 'student-grade.read', 'reporting.read'],
  },
  {
    role: 'tu',
    label: 'TU',
    description: 'Administrasi sekolah dan bantuan data operasional tanpa menjadi admin teknis.',
    permissions: ['academic.manage', 'academic-calendar.manage', 'reporting.read'],
  },
  {
    role: 'bk',
    label: 'Guru BK',
    description: 'Monitoring kehadiran, kedisiplinan, dan tindak lanjut siswa.',
    permissions: ['attendance.read', 'student-grade.read', 'class-status.read'],
  },
  {
    role: 'orang_tua',
    label: 'Orang Tua',
    description: 'Akses portal wali murid untuk melihat presensi dan ringkasan anak sendiri.',
    permissions: ['attendance.read', 'student-grade.read'],
  },
];

const explanationCards = [
  {
    title: 'Nonaktif',
    description:
      'Data disembunyikan dari operasional baru, tetapi histori jadwal, agenda, presensi, audit, dan laporan lama tetap aman.',
    tone: 'bg-blue-50 text-brand-700 border-blue-100',
  },
  {
    title: 'Hapus permanen',
    description:
      'Data benar-benar dihapus dari database. Ini rawan merusak relasi dan histori, jadi tidak dipakai untuk entity penting.',
    tone: 'bg-rose-50 text-rose-700 border-rose-100',
  },
];

export function AdminAccessCenter() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [userActionState, setUserActionState] = useState<ActionState>('idle');
  const [message, setMessage] = useState<string>('');
  const [userMessage, setUserMessage] = useState<string>('');
  const [query, setQuery] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    name: '',
    password: '',
    role: 'operator_sekolah',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTeachers() {
      setLoadState('loading');

      try {
        const [teacherResponse, userResponse] = await Promise.all([
          api.getTeachers(),
          api.getUsers().catch(() => ({ data: [] as AppUser[] })),
        ]);

        if (!isMounted) {
          return;
        }

        setTeachers(teacherResponse.data);
        setUsers(userResponse.data);
        setLoadState('success');
      } catch {
        if (isMounted) {
          setLoadState('error');
        }
      }
    }

    void loadTeachers();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTeachers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      [teacher.name, teacher.nip, teacher.email, teacher.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, teachers]);

  async function handleDeactivateTeacher(teacher: Teacher) {
    const confirmed = window.confirm(
      `Nonaktifkan ${teacher.name}? Jadwal aktif guru akan ikut dinonaktifkan, tetapi histori lama tetap aman.`,
    );

    if (!confirmed) {
      return;
    }

    setActionState('loading');
    setMessage('');

    try {
      const response = await api.deleteTeacher(teacher.id);
      setTeachers((currentTeachers) =>
        currentTeachers.filter((currentTeacher) => currentTeacher.id !== teacher.id),
      );
      setActionState('success');
      setMessage(response.message ?? `${teacher.name} berhasil dinonaktifkan.`);
      toast.success(
        response.message ?? `${teacher.name} berhasil dinonaktifkan.`,
        'Guru Dinonaktifkan',
      );
    } catch {
      setActionState('error');
      setMessage(
        'Gagal menonaktifkan guru. Pastikan sudah login sebagai root/operator_sekolah dan token tersimpan.',
      );
      toast.error('Gagal menonaktifkan guru.', 'Aksi Gagal');
    }
  }

  async function handleDeleteTeacherPermanently(teacher: Teacher) {
    const confirmed = window.confirm(
      `Hapus permanen guru ${teacher.name}? Gunakan hanya untuk data salah input. Jika guru sudah punya histori jadwal/agenda, sistem akan menolak.`,
    );

    if (!confirmed) {
      return;
    }

    setActionState('loading');
    setMessage('');

    try {
      const response = await api.deleteTeacherPermanently(teacher.id);
      setTeachers((currentTeachers) =>
        currentTeachers.filter((currentTeacher) => currentTeacher.id !== teacher.id),
      );
      setActionState('success');
      setMessage(response.message ?? `${teacher.name} berhasil dihapus permanen.`);
      toast.success(
        response.message ?? `${teacher.name} berhasil dihapus permanen.`,
        'Guru Dihapus',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Gagal hapus permanen guru: ${error.message}`
          : 'Gagal hapus permanen guru.';
      setActionState('error');
      setMessage(errorMessage);
      toast.error(errorMessage, 'Aksi Gagal');
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserActionState('loading');
    setUserMessage('');

    try {
      const response = await api.createUser({
        email: newUser.email.trim(),
        username: newUser.username.trim(),
        name: newUser.name.trim(),
        password: newUser.password,
        roles: [newUser.role],
      });
      setUsers((currentUsers) => [response.data, ...currentUsers]);
      setNewUser({
        email: '',
        username: '',
        name: '',
        password: '',
        role: 'operator_sekolah',
      });
      setUserActionState('success');
      setUserMessage(response.message ?? 'User berhasil dibuat.');
      toast.success(response.message ?? 'User berhasil dibuat.', 'User Baru');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Gagal membuat user: ${error.message}`
          : 'Gagal membuat user. Pastikan login sebagai root dan data belum dipakai.';
      setUserActionState('error');
      setUserMessage(errorMessage);
      toast.error(errorMessage, 'Aksi Gagal');
    }
  }

  async function handleDeactivateUser(user: AppUser) {
    const confirmed = window.confirm(
      `Nonaktifkan user ${user.username ?? user.email}? User tidak bisa login lagi, tetapi histori tetap aman.`,
    );

    if (!confirmed) {
      return;
    }

    setUserActionState('loading');
    setUserMessage('');

    try {
      const response = await api.deactivateUser(user.id);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
      setUserActionState('success');
      setUserMessage(response.message ?? 'User berhasil dinonaktifkan.');
      toast.success(
        response.message ?? 'User berhasil dinonaktifkan.',
        'User Dinonaktifkan',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Gagal menonaktifkan user: ${error.message}`
          : 'Gagal menonaktifkan user.';
      setUserActionState('error');
      setUserMessage(errorMessage);
      toast.error(errorMessage, 'Aksi Gagal');
    }
  }

  async function handleDeleteUser(user: AppUser) {
    const confirmed = window.confirm(
      `Hapus permanen user ${user.username ?? user.email}? Gunakan hanya untuk user salah input/test. Aksi ini tidak bisa dibatalkan.`,
    );

    if (!confirmed) {
      return;
    }

    setUserActionState('loading');
    setUserMessage('');

    try {
      const response = await api.deleteUser(user.id);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
      setUserActionState('success');
      setUserMessage(response.message ?? 'User berhasil dihapus permanen.');
      toast.success(
        response.message ?? 'User berhasil dihapus permanen.',
        'User Dihapus',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Gagal hapus permanen user: ${error.message}`
          : 'Gagal hapus permanen user.';
      setUserActionState('error');
      setUserMessage(errorMessage);
      toast.error(errorMessage, 'Aksi Gagal');
    }
  }

  return (
    <section className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {explanationCards.map((item) => (
          <article className={`rounded-[1.5rem] border p-4 ${item.tone}`} key={item.title}>
            <p className="text-sm font-black">{item.title}</p>
            <p className="mt-2 text-xs leading-5 opacity-90">{item.description}</p>
          </article>
        ))}
      </div>

      <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Role & Permission
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">Actor Sistem</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Role adalah kumpulan permission. Logic controller tetap memakai capability, bukan nama jabatan.
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
            {roleCards.length} role aktif
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {roleCards.map((role) => (
            <article className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4" key={role.role}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">{role.label}</h3>
                  <p className="mt-1 font-mono text-[0.7rem] font-bold text-brand-700">{role.role}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-black text-muted">
                  RBAC
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{role.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span
                    className="rounded-full border border-blue-100 bg-white px-2 py-1 text-[0.68rem] font-bold text-slate-600"
                    key={permission}
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
            User Management
          </p>
          <h2 className="mt-1 text-2xl font-black text-ink">Root Menentukan Admin</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Buat user pertama untuk `operator_sekolah`. Setelah itu operator sekolah yang mengelola guru dan data operasional.
          </p>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={handleCreateUser}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
              onChange={(event) =>
                setNewUser((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Nama lengkap"
              type="text"
              value={newUser.name}
            />
            <input
              className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              placeholder="Username"
              type="text"
              value={newUser.username}
            />
            <input
              className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
              onChange={(event) =>
                setNewUser((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="Email (opsional)"
              type="email"
              value={newUser.email}
            />
            <input
              className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Password sementara, minimal 8 karakter"
              type="password"
              value={newUser.password}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-brand-600 focus:bg-white sm:min-w-64"
              onChange={(event) =>
                setNewUser((current) => ({ ...current, role: event.target.value }))
              }
              value={newUser.role}
            >
              {roleCards.map((role) => (
                <option key={role.role} value={role.role}>
                  {role.label}
                </option>
              ))}
            </select>
            <button
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={
                userActionState === 'loading' ||
                !newUser.username.trim() ||
                !newUser.name.trim() ||
                newUser.password.length < 8
              }
              type="submit"
            >
              {userActionState === 'loading' ? 'Membuat...' : 'Buat User'}
            </button>
          </div>
        </form>

        {userMessage ? (
          <div
            className={[
              'mt-4 rounded-2xl border p-4 text-sm font-semibold',
              userActionState === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-900',
            ].join(' ')}
          >
            {userMessage}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {users.map((user) => (
            <article className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4" key={user.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-slate-900">{user.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {user.username ?? '-'} · {user.email}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {user.roles.map((role) => (
                      <span
                        className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700"
                        key={role}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={userActionState === 'loading'}
                      onClick={() => void handleDeactivateUser(user)}
                      type="button"
                    >
                      Nonaktif
                    </button>
                    <button
                      className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm shadow-rose-100 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={userActionState === 'loading'}
                      onClick={() => void handleDeleteUser(user)}
                      type="button"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {!users.length ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-muted">
              Daftar user hanya muncul setelah login sebagai root.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Teacher Admin
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">Nonaktifkan Guru</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Gunakan nonaktif, bukan hard delete, supaya histori akademik tetap utuh.
            </p>
          </div>
          <input
            className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white sm:w-64"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari guru..."
            type="search"
            value={query}
          />
        </div>

        {message ? (
          <div
            className={[
              'mt-4 rounded-2xl border p-4 text-sm font-semibold',
              actionState === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-900',
            ].join(' ')}
          >
            {message}
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Data guru belum bisa dimuat. Pastikan backend berjalan di port `3001`.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {loadState === 'loading' ? (
            <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-brand-700">
              Memuat data guru...
            </p>
          ) : null}

          {filteredTeachers.map((teacher) => (
            <article
              className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4"
              key={teacher.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-slate-900">{teacher.name}</h3>
                  <div className="mt-2 grid gap-1 text-xs font-semibold text-muted sm:grid-cols-2">
                    <span>NIP: {teacher.nip ?? '-'}</span>
                    <span>HP: {teacher.phone ?? '-'}</span>
                    <span>Email: {teacher.email ?? '-'}</span>
                    <span>Telegram: {teacher.telegramId ?? '-'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 shadow-sm shadow-amber-100 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={actionState === 'loading'}
                    onClick={() => void handleDeactivateTeacher(teacher)}
                    type="button"
                  >
                    {actionState === 'loading' ? 'Proses...' : 'Nonaktif'}
                  </button>
                  <button
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-100 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={actionState === 'loading'}
                    onClick={() => void handleDeleteTeacherPermanently(teacher)}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </article>
          ))}

          {loadState === 'success' && !filteredTeachers.length ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-muted">
              Tidak ada guru aktif sesuai pencarian.
            </p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
