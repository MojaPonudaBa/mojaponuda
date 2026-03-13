"use client";

import { useState } from "react";
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
  ChevronDown,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition-all",
            isActive
              ? "bg-white text-blue-600 shadow-sm"
              : "text-white/90 hover:bg-white/15"
          )}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600">
              PRO
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-[200px] flex-col bg-gradient-to-b from-[#4d8df8] via-[#2563eb] to-[#1d4ed8]">
      {/* Logo top */}
      <div className="flex items-center justify-center px-4 py-6">
        <Link href="/" className="flex items-center justify-center transition-opacity hover:opacity-90">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white">
            <Box className="size-5" />
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-1 scrollbar-hide">
        <div className="space-y-0.5">
          {coreItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-5 space-y-0.5">
          {intelligenceItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-5 space-y-0.5">
          {accountItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* User info at bottom — click chevron to sign out */}
      <div className="mt-auto border-t border-white/10 px-3 py-4">
        <div className="relative">
          {isMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white p-1.5 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <LogOut className="size-4" />
                Odjava
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-all hover:bg-white/10"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white" title={companyName ?? userEmail}>
                {companyName ?? userEmail.split("@")[0]}
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-center rounded-lg p-1 text-white/60">
              <ChevronDown className={cn("size-4 transition-transform", isMenuOpen && "rotate-180 text-white")} />
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}
