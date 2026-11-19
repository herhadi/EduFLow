import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { OrganizationCanvas } from '../../../components/school-organization/organization-canvas';

export default function OrganizationStructurePage() {
  return (
    <main className="py-6 sm:py-10">
      <Container>
        <PageHeader eyebrow="Profil Sekolah" title="Bagan Struktur Organisasi" description="Susunan pimpinan, wakil kepala sekolah, dan unsur pelaksana sekolah." />
        <OrganizationCanvas />
      </Container>
    </main>
  );
}
