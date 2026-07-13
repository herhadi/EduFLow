'use client';

import { useEffect, useState } from 'react';
import { getCurrentSessionUser } from '../lib/session';
import { ParentPortal } from './parent-portal';
import { PageHeader } from './ui/page-header';

export function ParentHistoryPage() {
  const [contact, setContact] = useState('');

  useEffect(() => {
    const currentUser = getCurrentSessionUser();
    setContact(currentUser?.email ?? currentUser?.username ?? '');
  }, []);

  return (
    <>
      <PageHeader
        description="Riwayat presensi dan nilai harian anak yang sudah disubmit guru."
        eyebrow="Riwayat Anak"
        showBackLink={false}
        title="Riwayat Presensi & Nilai"
      />
      <ParentPortal
        initialContact={contact}
        mode="history"
        title="Riwayat Anak"
      />
    </>
  );
}
