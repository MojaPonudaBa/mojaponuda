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
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            isActive
              ? "bg-white/20 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <item.icon className="size-[18px] shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white/80">
              PRO
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-[220px] flex-col overflow-hidden bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_50%,#1e40af_100%)]">
      <div className="flex flex-col px-5 py-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 text-white">
            <Box className="size-4" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-white">
            MojaPonuda
          </span>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
        <div className="space-y-1">
          {coreItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-6 space-y-1">
          {intelligenceItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-6 space-y-1">
          {accountItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      <div className="mt-auto border-t border-white/20 px-3 py-4">
        <div className="mb-3 flex items-center gap-2.5 px-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white/90" title={companyName ?? userEmail}>
              {companyName ?? userEmail}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/20 hover:text-white"
        >
          <LogOut className="size-4" />
          Odjava
        </button>
      </div>
    </aside>
  );
}
