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
      <Link href={item.href} className="block relative z-10 px-2 py-0.5">
        <span
          className={cn(
            "group flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 relative rounded-2xl",
            isActive
              ? "text-primary shadow-lg shadow-blue-900/5 bg-white font-bold"
              : "text-blue-100 hover:text-white hover:bg-white/10"
          )}
        >
          <item.icon 
            className={cn(
              "size-[18px] shrink-0 transition-colors", 
              isActive ? "text-primary" : "text-blue-200 group-hover:text-white"
            )} 
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors",
              isActive
                ? "bg-blue-100 text-primary"
                : "bg-white/20 text-white"
            )}>
              Pro
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="flex w-[280px] flex-col bg-primary h-full overflow-hidden shrink-0 relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-black/10 blur-3xl pointer-events-none" />
      
      {/* Brand */}
      <div className="flex flex-col px-6 py-8 relative z-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex size-8 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <Box className="size-5" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-heading text-xl font-bold tracking-tight text-white">
              MojaPonuda
            </span>
            <span className="font-heading text-xl font-bold text-blue-200">.ba</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2 relative z-10 custom-scrollbar">
        <div>
          <div className="space-y-1">
            {coreItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 mx-2">
          <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-widest text-blue-200/70">
            Tržište
          </p>
          <div className="space-y-1">
            {intelligenceItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 mx-2">
          <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-widest text-blue-200/70">
            Podešavanja
          </p>
          <div className="space-y-1">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-4 relative z-10">
        <div className="rounded-2xl bg-black/10 p-4 border border-white/5 backdrop-blur-sm">
          {companyName ? (
            <div className="mb-3">
              <p className="truncate text-sm font-bold text-white" title={companyName}>
                {companyName}
              </p>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2">
              <div className="size-2 rounded-full bg-amber-400" />
              <p className="text-xs font-medium text-amber-200">Firma nije dodana</p>
            </div>
          )}
          
          <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white font-bold text-xs">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <p className="truncate text-xs font-medium text-blue-100" title={userEmail}>
                {userEmail}
              </p>
            </div>
            
            <button
              onClick={handleSignOut}
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500/20 hover:text-red-300 transition-colors"
              title="Odjava"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
