import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { TeacherAttendance } from '../../../components/teacher-attendance';

export default function TeacherAttendancePage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Area guru untuk membuka kelas, mengisi presensi siswa, dan submit presensi sesuai agenda mengajar."
          eyebrow="Guru"
          title="Presensi Kelas"
        />

        <TeacherAttendance />
      </Container>
    </main>
  );
}
