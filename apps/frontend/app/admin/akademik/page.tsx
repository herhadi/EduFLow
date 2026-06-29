import { AcademicMasterManagement } from '../../../components/academic-master-management';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import Link from 'next/link';

export default function AdminAcademicPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola rombongan belajar, mata pelajaran, dan susunan jam pelajaran sesuai kebutuhan tahun ajaran."
          eyebrow="Admin Akademik"
          action={<Link className="secondary-button rounded-xl px-4 py-2 text-sm font-bold" href="/admin/akademik/kalender">Kalender Pendidikan</Link>}
          title="Master Akademik"
        />
        <AcademicMasterManagement />
      </Container>
    </main>
  );
}
