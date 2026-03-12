"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  ChevronRight,
  Activity,
  Box,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
}

const coreItems: NavItem[] = [
  { href: "/dashboard", label: "Pregled", icon: LayoutDashboard },
  { href: "/dashboard/vault", label: "Trezor", icon: FileText },
  { href: "/dashboard/bids", label: "Ponude", icon: Briefcase },
  { href: "/dashboard/tenders", label: "Skener", icon: Search },
];

const intelligenceItems: NavItem[] = [
  { href: "/dashboard/intelligence", label: "Analitika", icon: BarChart3, pro: true },
  { href: "/dashboard/intelligence/competitors", label: "Konkurencija", icon: Swords, pro: true },
  { href: "/dashboard/intelligence/upcoming", label: "Planirano", icon: Calendar, pro: true },
];

const accountItems: NavItem[] = [
  { href: "/dashboard/subscription", label: "Pretplata", icon: CreditCard },
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
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link href={item.href} className="block px-2">
        <span
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-blue-50 text-primary"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isActive
                ? "bg-blue-100 text-primary"
                : "bg-slate-100 text-slate-500"
            )}>
              Pro
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="flex w-[280px] flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex flex-col px-6 py-6 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-blue-500/20">
            <Box className="size-5" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-heading text-lg font-bold tracking-tight text-slate-900">
              MojaPonuda
            </span>
            <span className="font-heading text-lg font-bold text-primary">.ba</span>
          </div>
        </div>
        
        {companyName ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Aktivna firma</p>
            <p className="truncate text-sm font-bold text-slate-900" title={companyName}>
              {companyName}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <p className="text-xs font-medium">Firma nije dodana</p>
          </div>
        )}
      </div>

      {/* Core Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-6">
        <div>
          <p className="mb-2 px-4 text-xs font-semibold text-slate-400">
            GLAVNI MENI
          </p>
          <div className="space-y-0.5">
            {coreItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-4 text-xs font-semibold text-slate-400">
            TRŽIŠTE
          </p>
          <div className="space-y-0.5">
            {intelligenceItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-4 text-xs font-semibold text-slate-400">
            PODEŠAVANJA
          </p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-primary font-semibold text-sm">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-900" title={userEmail}>
              {userEmail}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-center gap-2 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Odjava
        </Button>
      </div>
    </aside>
  );
}
