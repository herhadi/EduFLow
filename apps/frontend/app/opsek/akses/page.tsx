'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminAccessCenter } from '../../../components/admin-access-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { getDashboardPathForRole, getPrimaryRole } from '../../../lib/navigation.config';
import { getCurrentSessionUser } from '../../../lib/session';

export default function AdminAccessPage() {
  const router = useRouter();
  const [isRoot, setIsRoot] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const role = getPrimaryRole(getCurrentSessionUser()?.roles ?? []);

    if (role !== 'root') {
      const redirectPath = getDashboardPathForRole(role);
      setChecked(true);
      const timeoutId = window.setTimeout(() => {
        router.replace(redirectPath);
      }, 1200);

      return () => window.clearTimeout(timeoutId);
    }

    setIsRoot(true);
    setChecked(true);

    return undefined;
  }, [router]);

  if (!checked) {
    return (
      <main>
        <Container>
          <div className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm">
            Memeriksa hak akses...
          </div>
        </Container>
      </main>
    );
  }

  if (!isRoot) {
    return (
      <main>
        <Container>
          <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
            Akses ditolak. Halaman ini khusus root. Mengarahkan ke menu sesuai role Anda...
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola user, role, permission, serta status akun sistem."
          eyebrow="Admin Akses"
          title="User & Hak Akses"
        />
        <AdminAccessCenter />
      </Container>
    </main>
  );
}
