'use client';

import { type FormEvent, useState } from 'react';
import { api, type AppUser } from '../lib/api';
import { type NewUserForm } from './admin-access-center/admin-access-center-utils';
import { UserManagementPanel } from './admin-access-center/user-management-panel';
import { ActiveAccountDirectory } from './active-account-directory';
import { useToast } from './ui/toast';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

export function AdminAccessCenter({
  canAssignRootRole = false,
  bootstrapOnly = false,
}: {
  canAssignRootRole?: boolean;
  bootstrapOnly?: boolean;
}) {
  const toast = useToast();
  const [directoryRefreshKey, setDirectoryRefreshKey] = useState(0);
  const [userActionState, setUserActionState] = useState<ActionState>('idle');
  const [userMessage, setUserMessage] = useState<string>('');
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    username: '',
    name: '',
    role: 'operator_sekolah',
  });


  async function handleProvisionTeacherAccounts() {
    setUserActionState('loading');
    setUserMessage('');
    try {
      const response = await api.provisionMissingTeacherAccounts();
      setDirectoryRefreshKey((current) => current + 1);
      setUserActionState('success');
      setUserMessage(response.message ?? `${response.data.created} akun guru berhasil dibuat.`);
      toast.success(response.message ?? 'Akun login guru berhasil disiapkan.', 'Akun Guru');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal membuat akun login guru.';
      setUserActionState('error');
      setUserMessage(errorMessage);
      toast.error(errorMessage, 'Akun Guru');
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
      setDirectoryRefreshKey((current) => current + 1);
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

  async function handleUpdateUserRoles(user: AppUser, roles: string[]) {
    setUserActionState('loading');
    setUserMessage('');
    try {
      const response = await api.updateUserRoles(user.id, roles);
      setUserActionState('success');
      setUserMessage(response.message ?? 'Role user berhasil diperbarui.');
      toast.success(response.message ?? 'Role user berhasil diperbarui.', 'Role Diperbarui');
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `Gagal mengubah role: ${error.message}`
        : 'Gagal mengubah role user.';
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
    <section className="mt-4 space-y-3">
      <UserManagementPanel
        bootstrapOnly={bootstrapOnly}
        canAssignRootRole={canAssignRootRole}
        newUser={newUser}
        onCreateUser={handleCreateUser}
        onProvisionTeacherAccounts={handleProvisionTeacherAccounts}
        onNewUserChange={(field, value) =>
          setNewUser((current) => ({ ...current, [field]: value }))
        }
        userActionState={userActionState}
        userMessage={userMessage}
      />

      {!bootstrapOnly ? (
        <ActiveAccountDirectory
          audience="admin"
          canManage
          canAssignRootRole={canAssignRootRole}
          refreshKey={directoryRefreshKey}
          onDeactivateUser={handleDeactivateUser}
          onDeleteUser={handleDeleteUser}
          onResetUserPassword={handleResetUserPassword}
          onUpdateUserRoles={handleUpdateUserRoles}
        />
      ) : null}
    </section>
  );
}
