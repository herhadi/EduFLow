import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

const reviewItems = [
  {
    title: 'Perangkat Ajar',
    description: 'Program Tahunan, Program Semester, KKTP, dan perencanaan pembelajaran guru.',
  },
  {
    title: 'Penilaian Semester',
    description: 'Nilai semester yang menunggu pemeriksaan dan persetujuan Kepala Sekolah.',
  },
  {
    title: 'Tindak Lanjut Guru',
    description: 'Koreksi presensi, keterlambatan submit, dan kelas kosong yang perlu perhatian.',
  },
];

export default function PrincipalReviewPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <PageHeader
          description="Pusat pekerjaan Kepala Sekolah untuk memeriksa administrasi guru dan memberi persetujuan akademik."
          eyebrow="Kepala Sekolah"
          title="Review & Persetujuan"
        />

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {reviewItems.map((item) => (
            <article
              className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60"
              key={item.title}
            >
              <h2 className="text-lg font-black text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              <p className="mt-4 text-xs font-black text-brand-700">Belum ada pengajuan</p>
            </article>
          ))}
        </section>
      </Container>
    </main>
  );
}
