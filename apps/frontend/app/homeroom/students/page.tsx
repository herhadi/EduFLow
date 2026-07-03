import { Container } from '../../../components/ui/container';
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

        <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold leading-6 text-muted shadow-sm shadow-blue-100/60">
          Rekap kelas binaan akan menggunakan data wali kelas pada tahun ajaran aktif. Untuk sementara, gunakan menu Presensi dan Jadwal sampai rekap khusus wali kelas diaktifkan.
        </section>
      </Container>
    </main>
  );
}
