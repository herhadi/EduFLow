import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function TeacherSchedulesPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Halaman ini disiapkan untuk jadwal mengajar guru yang sedang login. Setup jadwal keseluruhan tetap dikelola operator sekolah."
          eyebrow="Guru"
          title="Jadwal Saya"
        />

        <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-semibold leading-6 text-muted">
            Berikutnya halaman ini akan membaca jadwal berdasarkan akun guru yang
            login, menampilkan agenda hari ini, dan menyediakan aksi buka kelas
            atau presensi jika waktunya sesuai.
          </p>
        </section>
      </Container>
    </main>
  );
}
