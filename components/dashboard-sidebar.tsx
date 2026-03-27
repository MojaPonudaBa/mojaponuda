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
  Calendar,
  LogOut,
  Box,
  Settings,
  ChevronDown,
  Shield,
  CircleDollarSign,
  Wrench,
  Target,
  Users,
  Building2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ClientSelector } from "@/components/agency/client-selector";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
  exact?: boolean;
}

const coreItems: NavItem[] = [
  { href: "/dashboard", label: "Početna", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
  { href: "/dashboard/bids", label: "Moje ponude", icon: Briefcase },
  { href: "/dashboard/vault", label: "Dokumenti", icon: FileText },
];

const intelligenceItems: NavItem[] = [
  { href: "/dashboard/intelligence", label: "Analiza tržišta", icon: BarChart3, pro: true, exact: true },
  { href: "/dashboard/intelligence/upcoming", label: "Planirano", icon: Calendar, pro: true },
];

const accountItems: NavItem[] = [
  { href: "/dashboard/settings", label: "Postavke", icon: Settings },
  { href: "/dashboard/subscription", label: "Pretplata", icon: CreditCard },
];

const adminItems: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: Shield, exact: true },
  { href: "/dashboard/admin/agencies", label: "Agencije", icon: Users },
  { href: "/dashboard/admin/leads", label: "Leads", icon: Target },
  { href: "/dashboard/admin/financials", label: "Financials", icon: CircleDollarSign },
  { href: "/dashboard/admin/system", label: "System", icon: Wrench },
];

export interface AgencyClientNavItem {
  id: string;
  name: string;
}

interface DashboardSidebarProps {
  userEmail: string;
  companyName?: string;
  isAdmin?: boolean;
  isAgency?: boolean;
  agencyClients?: AgencyClientNavItem[];
}

export function DashboardSidebar({ userEmail, companyName, isAdmin = false, isAgency = false, agencyClients = [] }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sections = isAdmin
    ? [{ label: "Admin", items: adminItems }]
    : [
        { label: "Glavno", items: isAgency ? [
          { href: "/dashboard", label: "Početna", icon: LayoutDashboard, exact: true },
          { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
          { href: "/dashboard/agency", label: "Svi klijenti", icon: Users, exact: true },
          { href: "/dashboard/settings", label: "Postavke", icon: Settings },
          { href: "/dashboard/subscription", label: "Pretplata", icon: CreditCard },
        ] : coreItems },
        ...(isAgency ? [] : [
          { label: "Tržište", items: intelligenceItems },
          { label: "Račun", items: accountItems },
        ]),
      ];

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
            "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200",
            isActive
              ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_25px_-18px_rgba(15,23,42,0.95)]"
              : "text-slate-300 hover:bg-white/6 hover:text-white"
          )}
        >
          <item.icon className={cn("size-4 shrink-0", isActive ? "text-blue-200" : "text-slate-400")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-200">
              PRO
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-[244px] flex-col border-r border-slate-800/80 bg-[linear-gradient(180deg,#08111f_0%,#0b1730_52%,#102347_100%)] px-4 py-6 text-white shadow-[20px_0_60px_-40px_rgba(2,6,23,0.85)]">
      <div className="mb-10 flex items-center gap-3 px-2">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <Box className="size-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-bold tracking-tight text-white">MojaPonuda.ba</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{isAdmin ? "Admin" : "Početna"}</p>
          </div>
        </Link>
      </div>

      <nav className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {isAgency && agencyClients.length > 0 && (
          <div className="mb-6 px-2">
            <ClientSelector clients={agencyClients} />
          </div>
        )}
        {sections.map((section, index) => (
          <div key={section.label} className={index === 0 ? "" : "mt-7"}>
            <div className="mb-6 px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{section.label}</p>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/8 pt-4">
        <div className="relative">
          {isMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.45)]">
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
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/6 px-3 py-3.5 text-left transition-all duration-200 hover:bg-white/10"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/14 text-sm font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white" title={companyName ?? userEmail}>
                {companyName ?? userEmail.split("@")[0]}
              </p>
              <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
            </div>
            <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", isMenuOpen && "rotate-180 text-white")} />
          </button>
        </div>
      </div>
    </aside>
  );
}
