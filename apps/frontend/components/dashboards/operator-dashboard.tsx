import Link from 'next/link';
import { type CurrentUser } from './dashboard-types';
import { RoleActionCard, RoleHero, RoleSection } from './role-dashboard-shared';

export function OperatorHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Operator';

  return (
    <>
      <RoleHero
        description="Kelola data akademik, susun jadwal, dan pastikan kebutuhan operasional sekolah siap digunakan."
        eyebrow="Operator Sekolah"
        title={`Selamat bekerja, ${displayName}`}
      />

      <section className="mt-7 rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">
              Prioritas Operasional
            </h2>
            <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-100/75">
              Urutan cek harian agar jadwal, agenda, izin, dan data master siap dipakai guru.
            </p>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 shadow-sm dark:bg-emerald-400/15 dark:text-emerald-100">
            Operator
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OperatorPriorityItem
            description="Pastikan jadwal tahun ajaran aktif sudah benar dan agenda periode berjalan sudah dibuat."
            href="/admin/schedules"
            label="Jadwal & Agenda"
          />
          <OperatorPriorityItem
            description="Cek request izin/sakit yang menunggu tindakan operator atau wali kelas."
            href="/admin/leave-requests"
            label="Izin/Sakit"
          />
          <OperatorPriorityItem
            description="Lengkapi guru, mapel ampu, wali kelas, akun login, dan data siswa."
            href="/admin/guru"
            label="Data Guru"
          />
          <OperatorPriorityItem
            description="Cek tahun ajaran, rombel, mapel, jam pelajaran, dan Kaldik."
            href="/admin/akademik"
            label="Master Akademik"
          />
        </div>
      </section>

      <section className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none">
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-[var(--text)]">
          Alur Setup Tahun Ajaran
        </h2>
        <p className="mt-1 text-sm text-muted">
          Dipakai saat sekolah mulai menyiapkan tahun ajaran baru atau menyalin master lama.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <OperatorStep number="1" text="Salin master dari tahun berjalan ke tahun ajaran target." />
          <OperatorStep number="2" text="Periksa Kaldik, hari libur, dan tanggal efektif sekolah." />
          <OperatorStep number="3" text="Lengkapi guru, penugasan mapel, wali kelas, dan akun login." />
          <OperatorStep number="4" text="Susun jam pelajaran dan jadwal kelas tanpa bentrok." />
          <OperatorStep number="5" text="Generate agenda untuk rentang tanggal yang akan dipakai." />
        </div>
      </section>

      <RoleSection description="Akses pendukung ketika perlu melengkapi data atau menelusuri perubahan." title="Aksi Lanjutan">
        <RoleActionCard href="/admin/guru" label="Pengaturan Guru" description="Atur data guru, akun, role, mapel ampu, dan wali kelas." />
        <RoleActionCard href="/admin/akademik" label="Admin Akademik" description="Kelola rombel, mata pelajaran, jam pelajaran, dan master akademik." />
        <RoleActionCard href="/admin/import-data" label="Import Data" description="Upload data guru dan siswa dari file sekolah." />
        <RoleActionCard href="/admin/audit" label="Audit Aktivitas" description="Telusuri perubahan data penting oleh operator." />
      </RoleSection>
    </>
  );
}

function OperatorPriorityItem({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-emerald-100 bg-white p-4 text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50"
      href={href}
    >
      <p className="text-sm font-black">{label}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
      <span className="mt-3 inline-flex text-xs font-black opacity-90">Buka</span>
    </Link>
  );
}

function OperatorStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-black text-white">
        {number}
      </span>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-[var(--text)]">{text}</p>
    </div>
  );
}
