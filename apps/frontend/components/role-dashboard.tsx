'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import {
  getDashboardPathForRole,
  getPrimaryRole,
  type UserRole,
} from '../lib/navigation.config';
import { getMonitoringDescription, getMonitoringTitle } from './dashboards/monitoring-copy';
import { OperatorHome } from './dashboards/operator-dashboard';
import { ParentHome } from './dashboards/parent-dashboard';
import { PrincipalHome } from './dashboards/principal-dashboard';
import { RootHome } from './dashboards/root-dashboard';
import { CounselingHome, StaffHome } from './dashboards/staff-dashboard';
import { TeacherHome } from './dashboards/teacher-dashboard';
import { TelegramActivationPrompt } from './dashboards/telegram-activation-prompt';
import { type CurrentUser } from './dashboards/dashboard-types';
import { OperationalDashboard } from './operational-dashboard';
import { PageHeader } from './ui/page-header';

export function RoleDashboard({
  dashboardRole,
}: {
  dashboardRole?: UserRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      setProfileChecked(true);
      return;
    }

    try {
      const user = JSON.parse(storedUser) as CurrentUser;
      setCurrentUser(user);
      setRole(getPrimaryRole(user.roles ?? []));
      setTeacherPhotoUrl(user.photoUrl ?? null);
      void import('../lib/api')
        .then(({ api }) => api.getMyProfile())
        .then((response) => {
          setCurrentUser(response.data);
          setTeacherPhotoUrl(response.data.photoUrl ?? null);
          localStorage.setItem('currentUser', JSON.stringify({ ...user, ...response.data }));
        })
        .catch(() => undefined)
        .finally(() => setProfileChecked(true));
    } catch {
      localStorage.removeItem('currentUser');
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!role || dashboardRole) {
      return;
    }

    const dashboardPath = getDashboardPathForRole(role);

    if (dashboardPath !== '/dashboard' && dashboardPath !== pathname) {
      router.replace(dashboardPath);
    }
  }, [dashboardRole, pathname, role, router]);

  if (!role) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm shadow-blue-100/60">
        Menyiapkan beranda sesuai akun...
      </div>
    );
  }

  const activeRole = dashboardRole ?? role;

  if (!dashboardRole && activeRole !== 'root' && pathname !== getDashboardPathForRole(activeRole)) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm shadow-blue-100/60">
        Mengarahkan ke dashboard sesuai role...
      </div>
    );
  }

  if (activeRole === 'guru' || activeRole === 'wali_kelas') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <TeacherHome
          currentUser={currentUser}
          isHomeroom={currentUser?.roles?.includes('wali_kelas') ?? activeRole === 'wali_kelas'}
          photoUrl={teacherPhotoUrl}
        />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'operator_sekolah') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <OperatorHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'kepala_sekolah') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <PrincipalHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'orang_tua') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <ParentHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'tu') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <StaffHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'bk') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <CounselingHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'root') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <RootHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  return (
    <DashboardWithTelegramPrompt
      activeRole={activeRole}
      currentUser={currentUser}
      profileChecked={profileChecked}
    >
      <PageHeader
        description={getMonitoringDescription(activeRole)}
        eyebrow="EduFlow"
        showBackLink={false}
        title={getMonitoringTitle(activeRole)}
      />
      <OperationalDashboard />
    </DashboardWithTelegramPrompt>
  );
}

function DashboardWithTelegramPrompt({
  activeRole,
  children,
  currentUser,
  profileChecked,
}: {
  activeRole: UserRole;
  children: ReactNode;
  currentUser: CurrentUser | null;
  profileChecked: boolean;
}) {
  return (
    <>
      {profileChecked && !currentUser?.telegramId ? (
        <TelegramActivationPrompt activeRole={activeRole} />
      ) : null}
      {children}
    </>
  );
}
