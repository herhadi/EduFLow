import { ImportDataCenter } from '../../components/import-data-center';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function ImportDataPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Upload file Excel sekolah untuk mengisi guru, siswa, kelas, mata pelajaran, dan jadwal tanpa input satu-satu."
          eyebrow="Import Data"
          title="Import Data Akademik"
        />

        <ImportDataCenter />
      </Container>
    </main>
  );
}
