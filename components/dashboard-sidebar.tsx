"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Building2,
  Eye,
  Kanban,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TenderSistemLogo } from "@/components/brand/tender-sistem-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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
  { href: "/dashboard/ponude", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/bids", label: "Moje ponude", icon: Briefcase },
  { href: "/dashboard/watchlist", label: "Praćenja", icon: Eye },
  { href: "/dashboard/trziste", label: "Tržište", icon: BarChart3 },
  { href: "/dashboard/vault", label: "Dokumenti", icon: FileText },
  { href: "/dashboard/prilike", label: "Poticaji", icon: Sparkles, pro: true },
];

const adminItems: NavItem[] = [
  { href: "/dashboard/admin", label: "Pregled", icon: Shield, exact: true },
  { href: "/dashboard/admin/agencies", label: "Agencije", icon: Users },
  { href: "/dashboard/admin/leads", label: "Upiti", icon: Target },
  { href: "/dashboard/admin/financials", label: "Prihodi", icon: CircleDollarSign },
  { href: "/dashboard/admin/prilike", label: "Prilike i izvori", icon: Sparkles },
  { href: "/dashboard/admin/posts", label: "Postovi", icon: FileText },
  { href: "/dashboard/admin/zakon", label: "Zakon", icon: Scale },
  { href: "/dashboard/admin/system", label: "Sistem", icon: Wrench },
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

function UserAvatar({ userEmail }: { userEmail: string }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/14 text-sm font-bold text-white">
      {userEmail.charAt(0).toUpperCase()}
    </div>
  );
}

export function DashboardSidebar({
  userEmail,
  companyName,
  isAdmin = false,
  isAgency = false,
  agencyClients = [],
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [desktopClientDropdownOpen, setDesktopClientDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileClientDropdownOpen, setMobileClientDropdownOpen] = useState(false);

  const clientMatch = pathname.match(/\/dashboard\/agency\/clients\/([^/]+)/);
  const activeClientId = clientMatch?.[1] ?? null;
  const isClientSubPage = activeClientId
    ? /\/dashboard\/agency\/clients\/[^/]+\/(home|tenders|bids|documents|prilike|intelligence)/.test(pathname)
    : false;
  const activeClient = isClientSubPage && activeClientId
    ? agencyClients.find((client) => client.id === activeClientId)
    : null;

  const clientNavItems: NavItem[] = useMemo(
    () =>
      activeClient
        ? [
            {
              href: `/dashboard/agency/clients/${activeClient.id}/home`,
              label: "Početna",
              icon: LayoutDashboard,
              exact: true,
            },
            { href: `/dashboard/agency/clients/${activeClient.id}/tenders`, label: "Tenderi", icon: Search },
            { href: `/dashboard/agency/clients/${activeClient.id}/bids`, label: "Ponude", icon: Briefcase },
            { href: `/dashboard/agency/clients/${activeClient.id}/documents`, label: "Dokumenti", icon: FileText },
            { href: `/dashboard/agency/clients/${activeClient.id}/prilike`, label: "Poticaji", icon: Sparkles },
          ]
        : [],
    [activeClient],
  );

  const agencyDefaultItems: NavItem[] = useMemo(
    () => [
      { href: "/dashboard/agency", label: "Svi klijenti", icon: Users, exact: true },
      { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
    ],
    [],
  );

  const sections = isAdmin
    ? [{ label: "Admin", items: adminItems }]
    : isAgency && activeClient
      ? [{ label: activeClient.name, items: clientNavItems }]
      : isAgency
        ? [{ label: "Glavno", items: agencyDefaultItems }]
        : [{ label: "Glavno", items: coreItems }];

  const mobileSubtitle = isAdmin
    ? "Admin"
    : activeClient?.name ?? companyName ?? (isAgency ? "Agencija" : "Pregled");

  useEffect(() => {
    const routes = new Set<string>([
      "/dashboard",
      "/dashboard/tenders",
      "/dashboard/ponude",
      "/dashboard/bids",
      "/dashboard/watchlist",
      "/dashboard/trziste",
      "/dashboard/vault",
      "/dashboard/prilike",
      "/dashboard/subscription",
      "/dashboard/settings",
      ...(isAdmin ? adminItems.map((item) => item.href) : []),
      ...(isAgency ? agencyDefaultItems.map((item) => item.href) : coreItems.map((item) => item.href)),
      ...clientNavItems.map((item) => item.href),
    ]);

    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [clientNavItems, isAdmin, isAgency, router, agencyDefaultItems]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function navigateTo(href: string) {
    setDesktopMenuOpen(false);
    setMobileClientDropdownOpen(false);
    setDesktopClientDropdownOpen(false);
    setMobileOpen(false);
    router.push(href);
  }

  function renderNavLink(item: NavItem, onNavigate?: () => void) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href);

    return (
      <Link href={item.href} prefetch className="block" onClick={onNavigate}>
        <span
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200",
            isActive
              ? "bg-[linear-gradient(180deg,rgba(59,130,246,0.24),rgba(37,99,235,0.14))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_28px_-22px_rgba(15,23,42,0.85)] ring-1 ring-white/10"
              : "text-slate-300 hover:bg-white/8 hover:text-white",
          )}
        >
          <item.icon className={cn("size-4 shrink-0", isActive ? "text-blue-200" : "text-slate-400")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro ? (
            <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-200">
              PRO
            </span>
          ) : null}
        </span>
      </Link>
    );
  }

  function renderClientSwitcher(mobile = false) {
    const open = mobile ? mobileClientDropdownOpen : desktopClientDropdownOpen;
    const setOpen = mobile ? setMobileClientDropdownOpen : setDesktopClientDropdownOpen;

    if (!isAgency || agencyClients.length === 0) {
      return null;
    }

    return (
      <div className={mobile ? "mt-6" : "mt-7"}>
        <div className="mb-3 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {activeClient ? "Promijeni klijenta" : "Klijent"}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium text-slate-300 transition-all duration-200 hover:bg-white/8 hover:text-white",
              mobile && "border border-white/10 bg-white/[0.04]",
            )}
          >
            <Building2 className="size-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate">{activeClient?.name ?? "Odaberi klijenta"}</span>
            <ChevronsUpDown className={cn("size-3.5 shrink-0 text-slate-400 transition-transform", open && "text-white")} />
          </button>
          {open ? (
            <div
              className={cn(
                "z-50 mt-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.45)]",
                mobile ? "relative" : "absolute left-0 right-0 top-full",
              )}
            >
              <div className="max-h-52 overflow-y-auto">
                {agencyClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => navigateTo(`/dashboard/agency/clients/${client.id}/home`)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      client.id === activeClientId
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <Building2 className="size-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{client.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderAccountActions(mobile = false) {
    if (mobile) {
      return (
        <div className="mt-auto space-y-3 border-t border-white/8 pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.07] px-3 py-3.5">
            <UserAvatar userEmail={userEmail} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white" title={companyName ?? userEmail}>
                {companyName ?? userEmail.split("@")[0]}
              </p>
              <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
            </div>
          </div>
          <div className="grid gap-2">
              <Link
                href="/dashboard/settings"
                prefetch
                onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="size-4" />
              Račun
            </Link>
              <Link
                href="/dashboard/subscription"
                prefetch
                onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <CreditCard className="size-4" />
              Pretplata
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              Odjava
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-auto border-t border-white/8 pt-4">
        <div className="relative">
          {desktopMenuOpen ? (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.45)]">
              <Link
                href="/dashboard/settings"
                prefetch
                onClick={() => setDesktopMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Settings className="size-4" />
                Račun
              </Link>
              <Link
                href="/dashboard/subscription"
                prefetch
                onClick={() => setDesktopMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <CreditCard className="size-4" />
                Pretplata
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <LogOut className="size-4" />
                Odjava
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setDesktopMenuOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.07] px-3 py-3.5 text-left transition-all duration-200 hover:bg-white/10"
          >
            <UserAvatar userEmail={userEmail} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white" title={companyName ?? userEmail}>
                {companyName ?? userEmail.split("@")[0]}
              </p>
              <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
            </div>
            <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", desktopMenuOpen && "rotate-180 text-white")} />
          </button>
        </div>
      </div>
    );
  }

  function renderSidebarNav(mobile = false) {
    return (
      <>
        <nav className={cn("hide-scrollbar min-h-0 flex-1 overflow-y-auto pr-1", mobile && "pr-0")}>
          {isAgency && activeClient ? (
            <div className="mb-5">
              <Link
                href="/dashboard/agency"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-800/60 px-3.5 py-2.5 text-[13px] font-semibold text-slate-200 transition-all duration-200 hover:border-slate-400 hover:bg-slate-700/60 hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Agencijski pregled
              </Link>
            </div>
          ) : null}

          {sections.map((section, index) => (
            <div key={section.label} className={index === 0 ? "" : "mt-7"}>
              <div className="mb-6 px-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{section.label}</p>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
              </div>
            </div>
          ))}

          {renderClientSwitcher(mobile)}
        </nav>

        {renderAccountActions(mobile)}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-[1760px] items-center justify-between gap-3 px-4 sm:px-6">
          <TenderSistemLogo
            href={isAgency ? "/dashboard/agency" : "/dashboard"}
            size="sm"
            subtitle={mobileSubtitle}
            className="min-w-0"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() => setMobileOpen(true)}
            className="shrink-0 rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950"
            aria-label="Otvori navigaciju"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[88vw] max-w-[340px] border-r border-slate-800 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_26%),linear-gradient(180deg,#071120_0%,#0b1730_52%,#102347_100%)] p-0 text-white"
        >
          <SheetHeader className="border-b border-white/8 px-4 py-5">
            <SheetTitle className="sr-only">Navigacija</SheetTitle>
            <TenderSistemLogo
              href={isAgency ? "/dashboard/agency" : "/dashboard"}
              size="sm"
              theme="dark"
              subtitle={mobileSubtitle}
              className="transition-opacity hover:opacity-90"
              priority
            />
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            {renderSidebarNav(true)}
          </div>
        </SheetContent>
      </Sheet>

      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-[244px] flex-col border-r border-slate-800/80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_22%),linear-gradient(180deg,#071120_0%,#0b1730_52%,#102347_100%)] px-4 py-6 text-white shadow-[20px_0_60px_-40px_rgba(2,6,23,0.85)] lg:flex">
        <div className="mb-10 px-2">
          <TenderSistemLogo
            href={isAgency ? "/dashboard/agency" : "/dashboard"}
            size="sm"
            theme="dark"
            subtitle={isAdmin ? "Admin" : isAgency ? "Agencija" : "Početna"}
            className="transition-opacity hover:opacity-90"
            priority
          />
        </div>

        {renderSidebarNav()}
      </aside>
    </>
  );
}
