"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  FileText,
  Kanban,
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
  { href: "/dashboard", label: "Pregled", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
  { href: "/dashboard/ponude", label: "Tok ponuda", icon: Kanban },
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
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const clientMatch = pathname.match(/\/dashboard\/agency\/clients\/([^/]+)/);
  const activeClientId = clientMatch?.[1] ?? null;
  const activeClient = activeClientId
    ? agencyClients.find((client) => client.id === activeClientId) ?? null
    : null;

  const clientNavItems: NavItem[] = useMemo(
    () =>
      activeClient
        ? [
            { href: `/dashboard/agency/clients/${activeClient.id}/home`, label: "Pregled", icon: LayoutDashboard, exact: true },
            { href: `/dashboard/agency/clients/${activeClient.id}/tenders`, label: "Tenderi", icon: Search },
            { href: `/dashboard/agency/clients/${activeClient.id}/bids`, label: "Ponude", icon: Briefcase },
            { href: `/dashboard/agency/clients/${activeClient.id}/documents`, label: "Dokumenti", icon: FileText },
            { href: `/dashboard/agency/clients/${activeClient.id}/prilike`, label: "Poticaji", icon: Sparkles },
            { href: `/dashboard/agency/clients/${activeClient.id}/intelligence`, label: "Uvidi", icon: BarChart3 },
          ]
        : [],
    [activeClient],
  );

  const agencyDefaultItems: NavItem[] = useMemo(
    () => [
      { href: "/dashboard/agency", label: "Svi klijenti", icon: Users, exact: true },
      { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
      { href: "/dashboard/bids", label: "Sve ponude", icon: Briefcase },
    ],
    [],
  );

  const sections = isAdmin
    ? [{ label: "Admin", items: adminItems }]
    : isAgency && activeClient
      ? [{ label: activeClient.name, items: clientNavItems }]
      : isAgency
        ? [{ label: "Glavno", items: agencyDefaultItems }]
        : [
            { label: "Glavno", items: coreItems.slice(0, 6) },
            { label: "Dokumenti", items: coreItems.slice(6, 7) },
            { label: "Ostalo", items: coreItems.slice(7) },
          ];

  useEffect(() => {
    const routes = [
      "/dashboard",
      "/dashboard/tenders",
      "/dashboard/ponude",
      "/dashboard/bids",
      "/dashboard/watchlist",
      "/dashboard/trziste",
      "/dashboard/vault",
      "/dashboard/prilike",
      "/dashboard/settings",
      "/dashboard/subscription",
      ...sections.flatMap((section) => section.items.map((item) => item.href)),
    ];
    [...new Set(routes)].forEach((route) => router.prefetch(route));
  }, [router, sections]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function navigateTo(href: string) {
    setAccountOpen(false);
    setClientDropdownOpen(false);
    setMobileOpen(false);
    router.push(href);
  }

  function renderNavLink(item: NavItem) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href);

    return (
      <Link key={item.href} href={item.href} prefetch onClick={() => setMobileOpen(false)} className="block">
        <span
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
          )}
        >
          <item.icon className={cn("size-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              PRO
            </span>
          ) : null}
        </span>
      </Link>
    );
  }

  function renderClientSwitcher() {
    if (!isAgency || agencyClients.length === 0) return null;

    return (
      <div className="mt-5">
        <p className="mb-2 px-2 text-[11px] font-bold uppercase text-slate-400">
          {activeClient ? "Klijent" : "Odaberi klijenta"}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setClientDropdownOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Building2 className="size-4 shrink-0 text-blue-600" />
            <span className="flex-1 truncate text-left">{activeClient?.name ?? "Odaberi klijenta"}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400" />
          </button>
          {clientDropdownOpen ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              <div className="max-h-56 overflow-y-auto">
                {agencyClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => navigateTo(`/dashboard/agency/clients/${client.id}/home`)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
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

  function renderAccountMenu() {
    return (
      <div className="mt-auto border-t border-slate-200 pt-4">
        <div className="relative">
          {accountOpen ? (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              <AccountLink href="/dashboard/settings" icon={Settings} label="Postavke" onClick={() => setAccountOpen(false)} />
              <AccountLink href="/dashboard/subscription" icon={CreditCard} label="Pretplata" onClick={() => setAccountOpen(false)} />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <LogOut className="size-4" />
                Odjava
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
          >
            <UserAvatar userEmail={userEmail} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950" title={companyName ?? userEmail}>
                {companyName ?? userEmail.split("@")[0]}
              </p>
              <p className="truncate text-xs text-slate-500">Premium plan</p>
            </div>
            <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", accountOpen && "rotate-180")} />
          </button>
        </div>
      </div>
    );
  }

  function renderSidebarContent() {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        {isAgency && activeClient ? (
          <Link
            href="/dashboard/agency"
            onClick={() => setMobileOpen(false)}
            className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" />
            Agencijski pregled
          </Link>
        ) : null}

        <nav className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
          {sections.map((section, index) => (
            <div key={section.label} className={index === 0 ? "" : "mt-6"}>
              <p className="mb-2 px-2 text-[11px] font-bold uppercase text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">{section.items.map(renderNavLink)}</div>
            </div>
          ))}
          {renderClientSwitcher()}
        </nav>
        {renderAccountMenu()}
      </div>
    );
  }

  const mobileSubtitle = isAdmin
    ? "Admin"
    : activeClient?.name ?? companyName ?? (isAgency ? "Agencija" : "Pregled");

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-[1720px] items-center justify-between gap-3 px-4 sm:px-6">
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
            className="shrink-0 rounded-lg border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Otvori navigaciju"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton className="w-[88vw] max-w-[340px] border-r border-slate-200 bg-white p-0">
          <SheetHeader className="border-b border-slate-200 px-4 py-5">
            <SheetTitle className="sr-only">Navigacija</SheetTitle>
            <TenderSistemLogo
              href={isAgency ? "/dashboard/agency" : "/dashboard"}
              size="sm"
              subtitle={mobileSubtitle}
              priority
            />
          </SheetHeader>
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>

      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-[244px] flex-col border-r border-slate-200 bg-white shadow-[12px_0_32px_-28px_rgba(15,23,42,0.35)] lg:flex">
        <div className="px-5 py-6">
          <TenderSistemLogo
            href={isAgency ? "/dashboard/agency" : "/dashboard"}
            size="sm"
            subtitle={isAdmin ? "Admin" : isAgency ? "Agencija" : "Pregled"}
            priority
          />
        </div>
        {renderSidebarContent()}
      </aside>
    </>
  );
}

function AccountLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
