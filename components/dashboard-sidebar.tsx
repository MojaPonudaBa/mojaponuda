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
  ChevronDown,
  Box,
  Settings,
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
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link href={item.href} className="block relative z-10">
        <span
          className={cn(
            "group flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors border-l-4",
            isActive
              ? "text-white bg-white/10 border-blue-400"
              : "text-slate-300 border-transparent hover:text-white hover:bg-white/5 hover:border-slate-500"
          )}
        >
          <item.icon 
            className={cn(
              "size-4 shrink-0", 
              isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-300"
            )} 
          />
          <span className="flex-1 truncate tracking-wide">{item.label}</span>
          {item.pro && (
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border",
              isActive
                ? "bg-blue-900/50 text-blue-300 border-blue-400/30"
                : "bg-slate-800/50 text-slate-400 border-slate-600/50"
            )}>
              PRO
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="flex w-[260px] flex-col bg-[#0f172a] border-r border-slate-800 h-full overflow-hidden shrink-0">
      {/* Brand */}
      <div className="flex flex-col px-6 py-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex size-7 items-center justify-center bg-blue-600 text-white rounded-sm">
            <Box className="size-4" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-heading text-lg font-bold tracking-tight text-white">
              MojaPonuda
            </span>
            <span className="font-heading text-lg font-bold text-blue-400">.ba</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <div className="space-y-0.5 mb-6">
          {coreItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mb-6">
          <p className="px-6 mb-2 text-xs font-mono font-semibold tracking-widest text-slate-500 uppercase">
            Tržište
          </p>
          <div className="space-y-0.5">
            {intelligenceItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-6 mb-2 text-xs font-mono font-semibold tracking-widest text-slate-500 uppercase">
            Podešavanja
          </p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800 bg-[#0b1120]">
        <div className="mb-3">
          {companyName ? (
            <p className="truncate text-sm font-semibold text-slate-200" title={companyName}>
              {companyName}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-amber-500" />
              <p className="text-xs font-medium text-amber-500/80">Firma nije dodana</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex size-6 shrink-0 items-center justify-center bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <p className="truncate text-xs font-mono text-slate-400" title={userEmail}>
              {userEmail}
            </p>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex size-7 shrink-0 items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors border border-transparent hover:border-red-400/20"
            title="Odjava"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
