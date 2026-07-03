import { Container } from '../../../components/ui/container';
import { HomeroomStudents } from '../../../components/homeroom-students';
import { PageHeader } from '../../../components/ui/page-header';

export default function HomeroomStudentsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Area ini disiapkan untuk rekap siswa kelas binaan, tindak lanjut presensi, dan komunikasi wali murid."
          eyebrow="Wali Kelas"
          title="Kelas Binaan"
        />

        <HomeroomStudents />
      </Container>
    </main>
  );
}
