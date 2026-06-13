import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function TeacherAttendancePage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Area guru untuk membuka kelas, mengisi presensi siswa, dan submit presensi sesuai agenda mengajar."
          eyebrow="Guru"
          title="Presensi Kelas"
        />

        <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-semibold leading-6 text-muted">
            Berikutnya halaman ini akan menampilkan agenda mengajar guru yang
            sedang login, daftar siswa dari enrollment aktif, dan tombol submit
            presensi.
          </p>
        </section>
      </Container>
    </main>
  );
}
