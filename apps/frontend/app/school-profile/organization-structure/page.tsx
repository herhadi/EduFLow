import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { SchoolOrganization } from '../../../components/school-organization/school-organization';
import Link from 'next/link';

export default function OrganizationStructurePage() {
  return (
    <main className="py-6 sm:py-10">
      <Container>
        <PageHeader eyebrow="Profil Sekolah" title="Bagan Struktur Organisasi" description="Susunan pimpinan, wakil kepala sekolah, dan unsur pelaksana sekolah." />
        <div className="mb-4 flex justify-end">
          <Link href="/school-profile/organization-structure/connectors" className="rounded-xl border px-4 py-2 text-sm font-bold hover:bg-muted">
            Kelola Garis Konektor
          </Link>
        </div>
        <SchoolOrganization />
      </Container>
    </main>
  );
}
