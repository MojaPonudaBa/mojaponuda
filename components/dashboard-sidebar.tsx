"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Search,
  CreditCard,
  BarChart3,
  Swords,
  Calendar,
  LogOut,
  Box,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
  exact?: boolean;
}

const coreItems: NavItem[] = [
  { href: "/dashboard", label: "Pregled", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tenders", label: "Skener", icon: Search },
  { href: "/dashboard/vault", label: "Dokumenti", icon: FileText },
  { href: "/dashboard/bids", label: "Ponude", icon: Briefcase },
];

const intelligenceItems: NavItem[] = [
  { href: "/dashboard/intelligence", label: "Analitika", icon: BarChart3, pro: true, exact: true },
  { href: "/dashboard/intelligence/competitors", label: "Konkurencija", icon: Swords, pro: true },
  { href: "/dashboard/intelligence/upcoming", label: "Planirano", icon: Calendar, pro: true },
];

const accountItems: NavItem[] = [
  { href: "/dashboard/subscription", label: "Pretplata", icon: CreditCard },
  { href: "/dashboard/settings", label: "Postavke", icon: Settings },
];

interface DashboardSidebarProps {
  userEmail: string;
  companyName?: string;
}

export function DashboardSidebar({ userEmail, companyName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function NavLink({ item }: { item: NavItem }) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href);

    return (
      <Link href={item.href} className="block">
        <span
          className={cn(
            "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_-18px_rgba(59,130,246,0.9)] ring-1 ring-white/10"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          )}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
              isActive
                ? "border-blue-400/30 bg-blue-500/15 text-blue-200"
                : "border-white/5 bg-slate-950/20 text-slate-400 group-hover:border-white/10 group-hover:text-slate-200"
            )}
          >
            <item.icon className="size-4 shrink-0" />
          </span>
          <span className="flex-1 truncate tracking-wide">{item.label}</span>
          {item.pro && (
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold tracking-[0.2em] uppercase",
              isActive
                ? "border-blue-300/20 bg-blue-400/10 text-blue-200"
                : "border-slate-700 bg-slate-900/60 text-slate-400"
            )}>
              PRO
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="relative sticky top-0 flex h-screen w-[290px] shrink-0 flex-col overflow-hidden border-r border-slate-800/80 bg-[linear-gradient(180deg,#081121_0%,#0b1629_42%,#0f172a_100%)] shadow-[24px_0_80px_-52px_rgba(15,23,42,0.85)]">
      <div className="pointer-events-none absolute left-0 top-0 h-40 w-full bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_58%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_62%)]" />
      <div className="relative flex flex-col border-b border-white/10 px-7 py-7">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-white shadow-[0_10px_30px_-16px_rgba(59,130,246,0.75)]">
            <Box className="size-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-heading text-xl font-bold tracking-tight text-white">
                MojaPonuda
              </span>
              <span className="font-heading text-xl font-bold text-blue-300">.ba</span>
            </div>
            <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.28em] text-slate-400">
              Kontrolni centar
            </p>
          </div>
        </Link>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-slate-500">
            Radni prostor
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {companyName ?? "Postavite firmu"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Upravljanje ponudama, dokumentima i tržišnim signalima na jednom mjestu.
          </p>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="space-y-1.5">
          {coreItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-8">
          <p className="px-3 text-[11px] font-mono font-semibold uppercase tracking-[0.28em] text-slate-500">
            Tržište
          </p>
          <div className="mt-3 space-y-1.5">
            {intelligenceItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="px-3 text-[11px] font-mono font-semibold uppercase tracking-[0.28em] text-slate-500">
            Podešavanja
          </p>
          <div className="mt-3 space-y-1.5">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="relative border-t border-white/10 bg-slate-950/30 p-5 backdrop-blur-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 font-mono text-sm text-slate-200 shadow-inner">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100" title={companyName ?? "Račun"}>
                {companyName ?? "Administrativni račun"}
              </p>
              <p className="mt-1 truncate text-xs font-mono text-slate-400" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:border-red-400/20 hover:bg-red-400/10 hover:text-white"
            title="Odjava"
          >
            <LogOut className="size-4" />
            Odjava
          </button>
        </div>
      </div>
    </aside>
  );
}
