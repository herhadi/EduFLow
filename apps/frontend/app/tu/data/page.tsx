import { RoleActionCard, RoleSection } from '../../../components/dashboards/role-dashboard-shared';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function TuDataPage() {
  return (
    <main className="py-8">
      <Container>
        <PageHeader
          description="Direktori untuk pemeriksaan dan pencetakan data sekolah. Perubahan master akademik tetap menjadi kewenangan Operator Sekolah."
          eyebrow="Administrasi Tata Usaha"
          title="Direktori Data Sekolah"
        />
        <RoleSection
          description="Pilih direktori yang ingin diperiksa atau dicetak."
          title="Direktori Sekolah"
        >
          <RoleActionCard
            href="/tu/ringkasan/guru"
            label="Direktori Guru"
            description="Lihat identitas guru, informasi kontak, dan ringkasan penugasan mata pelajaran."
          />
          <RoleActionCard
            href="/tu/ringkasan/rombel"
            label="Direktori Rombel"
            description="Lihat daftar rombongan belajar, tingkat, kode kelas, dan wali kelas."
          />
          <RoleActionCard
            href="/tu/ringkasan/mapel"
            label="Direktori Mata Pelajaran"
            description="Lihat daftar mata pelajaran yang digunakan pada kegiatan akademik."
          />
          <RoleActionCard
            href="/tu/siswa-aktif"
            label="Daftar Siswa Aktif"
            description="Lihat, cari, dan cetak daftar siswa aktif beserta informasi wali."
          />
        </RoleSection>
      </Container>
    </main>
  );
}
