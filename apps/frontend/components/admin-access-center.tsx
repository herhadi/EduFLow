'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type AppUser, type Teacher } from '../lib/api';
import { explanationCards, type NewUserForm } from './admin-access-center/admin-access-center-utils';
import { TeacherAdminPanel } from './admin-access-center/teacher-admin-panel';
import { UserManagementPanel } from './admin-access-center/user-management-panel';
import { useToast } from './ui/toast';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type ActionState = 'idle' | 'loading' | 'success' | 'error';

export function AdminAccessCenter({
  showTeacherAdmin = false,
}: {
  showTeacherAdmin?: boolean;
}) {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [userActionState, setUserActionState] = useState<ActionState>('idle');
  const [message, setMessage] = useState<string>('');
  const [userMessage, setUserMessage] = useState<string>('');
  const [query, setQuery] = useState('');
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    username: '',
    name: '',
    role: 'operator_sekolah',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAccessData() {
      setLoadState('loading');

      try {
        const userResponse = await api.getUsers().catch(() => ({ data: [] as AppUser[] }));
        const teacherResponse = showTeacherAdmin
          ? await api.getTeachers()
          : { data: [] as Teacher[] };

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

    void loadAccessData();

    return () => {
      isMounted = false;
    };
  }, [showTeacherAdmin]);

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
        email: newUser.email.trim() || undefined,
        username: newUser.username.trim(),
        name: newUser.name.trim(),
        roles: [newUser.role],
      });
      setUsers((currentUsers) => [response.data, ...currentUsers]);
      setNewUser({
        email: '',
        username: '',
        name: '',
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

  async function handleResetUserPassword(user: AppUser) {
    const confirmed = window.confirm(
      `Reset password ${user.username ?? user.email} ke password default? Semua sesi aktif user ini akan dicabut dan user wajib mengganti password saat login berikutnya.`,
    );

    if (!confirmed) {
      return;
    }

    setUserActionState('loading');
    setUserMessage('');

    try {
      const response = await api.resetUserPassword(user.id);
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? response.data : currentUser,
        ),
      );
      setUserActionState('success');
      setUserMessage(response.message ?? 'Password user berhasil direset.');
      toast.success(
        response.message ?? 'Password user berhasil direset.',
        'Password Direset',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Gagal reset password user: ${error.message}`
          : 'Gagal reset password user.';
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
      {showTeacherAdmin ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {explanationCards.map((item) => (
            <article className={`rounded-[1.5rem] border p-4 ${item.tone}`} key={item.title}>
              <p className="text-sm font-black">{item.title}</p>
              <p className="mt-2 text-xs leading-5 opacity-90">{item.description}</p>
            </article>
          ))}
        </div>
      ) : null}

      <UserManagementPanel
        newUser={newUser}
        onCreateUser={handleCreateUser}
        onDeactivateUser={handleDeactivateUser}
        onDeleteUser={handleDeleteUser}
        onNewUserChange={(field, value) =>
          setNewUser((current) => ({ ...current, [field]: value }))
        }
        onResetUserPassword={handleResetUserPassword}
        userActionState={userActionState}
        userMessage={userMessage}
        users={users}
      />

      {showTeacherAdmin ? (
        <TeacherAdminPanel
          actionState={actionState}
          filteredTeachers={filteredTeachers}
          loadState={loadState}
          message={message}
          onDeactivateTeacher={handleDeactivateTeacher}
          onDeleteTeacherPermanently={handleDeleteTeacherPermanently}
          onQueryChange={setQuery}
          query={query}
        />
      ) : null}
    </section>
  );
}
