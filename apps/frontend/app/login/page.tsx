import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_#bfdbfe_0,_#eff6ff_34%,_#ffffff_80%)] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col justify-center">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-lg shadow-blue-200">
              E
            </span>
            <span>
              <span className="block text-lg font-black leading-none text-ink">
                EduFlow
              </span>
              <span className="mt-1 block text-xs font-semibold text-muted">
                Login Sistem
              </span>
            </span>
          </Link>

          <Link
            className="shrink-0 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black text-brand-700 shadow-sm shadow-blue-100 transition hover:bg-brand-50"
            href="/"
          >
            ← Landing
          </Link>
        </div>

        <section className="rounded-[2rem] border border-blue-100 bg-white/90 p-5 shadow-2xl shadow-blue-100 backdrop-blur">
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
            Login Sistem
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
            Masuk ke EduFlow
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Masuk sebagai operator, guru, kepala sekolah, atau admin sekolah.
            Autentikasi penuh akan disambungkan pada tahap berikutnya.
          </p>

          <form className="mt-6 space-y-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Email
              <input
                className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600 focus:bg-white"
                placeholder="operator@sekolah.sch.id"
                type="email"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Password
              <input
                className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600 focus:bg-white"
                placeholder="••••••••"
                type="password"
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 font-semibold text-muted">
                <input className="size-4 accent-brand-600" type="checkbox" />
                Ingat saya
              </label>
              <Link className="font-bold text-brand-700" href="/login">
                Lupa password?
              </Link>
            </div>

            <Link
              className="block rounded-2xl bg-brand-600 px-5 py-4 text-center text-sm font-black text-white shadow-xl shadow-blue-200 transition hover:bg-brand-700"
              href="/dashboard"
            >
              Masuk Sistem EduFlow
            </Link>
          </form>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-muted">
          Untuk sementara login belum memvalidasi akun. Berikutnya bisa
          disambungkan ke endpoint `POST /api/auth/login`.
        </p>
      </div>
    </main>
  );
}
