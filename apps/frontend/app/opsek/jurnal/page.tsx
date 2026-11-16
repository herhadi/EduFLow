export default function OpsekJournalDeniedPage() {
  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <section className="w-full rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900/60 dark:bg-[var(--surface-solid)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">403 · Akses Ditolak</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-[var(--text)]">Jurnal Kelas tidak tersedia di Operator Sekolah</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
          Menu monitoring jurnal telah dipindahkan ke Tata Usaha. Operator Sekolah tidak memiliki akses ke halaman ini.
        </p>
      </section>
    </main>
  );
}
