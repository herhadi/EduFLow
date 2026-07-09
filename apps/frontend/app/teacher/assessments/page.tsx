import { TeacherAssessments } from '../../../components/teacher-assessments';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function TeacherAssessmentsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Buat komponen nilai harian, simpan draft skor siswa, dan submit nilai sesuai kelas serta mata pelajaran yang diampu."
          eyebrow="Guru"
          title="Penilaian"
        />

        <TeacherAssessments />
      </Container>
    </main>
  );
}
