import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

const steps = [
  'Wali murid memilih anak dan tanggal izin/sakit.',
  'Wali murid mengisi alasan dan dapat melampirkan bukti.',
  'Wali kelas atau operator sekolah memverifikasi pengajuan.',
  'Status presensi berubah setelah pengajuan disetujui.',
];

export default function ParentPermitsPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <PageHeader
          description="Alur pengajuan izin/sakit disiapkan agar tidak bercampur dengan riwayat presensi."
          eyebrow="Izin/Sakit"
          showBackLink={false}
          title="Pengajuan Izin Anak"
        />

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="surface-card rounded-[1.75rem] p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-600">
              Belum Aktif
            </p>
            <h2 className="mt-2 text-xl font-black">Form pengajuan belum menerima data</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Menu ini sudah dipisahkan dari riwayat agar wali murid tahu lokasi pengajuan izin.
              Penyimpanan pengajuan akan diaktifkan setelah model approval wali kelas/operator dibuat.
            </p>

            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Anak
                <select className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-muted" disabled>
                  <option>Dipilih dari data wali murid</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Jenis
                <select className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-muted" disabled>
                  <option>Izin / Sakit</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Alasan
                <textarea
                  className="min-h-24 rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-muted"
                  disabled
                  placeholder="Contoh: sakit demam, kontrol dokter, atau keperluan keluarga."
                />
              </label>
              <button
                className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-500"
                disabled
                type="button"
              >
                Kirim Pengajuan
              </button>
            </div>
          </div>

          <aside className="surface-card rounded-[1.75rem] p-5">
            <h3 className="text-base font-black">Alur yang Disiapkan</h3>
            <div className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <div className="flex gap-3 rounded-2xl bg-blue-50 p-3" key={step}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-brand-700">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold leading-5 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </Container>
    </main>
  );
}
