import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-xl font-bold text-slate-900">
            MojaPonuda<span className="text-blue-600">.ba</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/prilike" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Prilike
            </Link>
            <Link href="/zakon" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Zakon
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Besplatno
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-white py-8 mt-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} MojaPonuda.ba — Informativni sadržaj. Uvijek provjerite originalne izvore.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-slate-600">Privatnost</Link>
            <Link href="/terms" className="hover:text-slate-600">Uvjeti</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
