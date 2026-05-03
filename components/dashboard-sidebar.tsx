"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  FolderOpen,
  GitBranch,
  Kanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Radar,
  Scale,
  Search,
  Settings,
  Shield,
  Sparkles,
  Tags,
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
  href?: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
  exact?: boolean;
  countKey?: "tracking" | "alerts" | "pipeline" | "bids";
  action?: "assistant";
  pill?: string;
}

const mainItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tenders", label: "Tenderi", icon: FileText },
  { href: "/dashboard/preporuceni", label: "Preporučeni tenderi", icon: Sparkles },
  { href: "/dashboard/rano-upozorenje", label: "Rano upozorenje", icon: Radar },
  { href: "/dashboard/narucioci", label: "Naručioci", icon: Building2 },
  { href: "/dashboard/intelligence/competitors", label: "Konkurencija", icon: Shield },
  { href: "/dashboard/cpv", label: "CPV klasifikacija", icon: Tags },
  { href: "/dashboard/agency", label: "Klijenti", icon: Users },
  { href: "/dashboard/trziste", label: "Analize i izvještaji", icon: BarChart3 },
];

const activityItems: NavItem[] = [
  { href: "/dashboard/pracenje", label: "Praćenje", icon: Eye, countKey: "tracking" },
  { href: "/dashboard/ponude", label: "Pipeline", icon: GitBranch, countKey: "pipeline" },
  { href: "/dashboard/bids", label: "Ponude", icon: FileCheck, countKey: "bids" },
  { href: "/dashboard/vault", label: "Dokumentacija", icon: FolderOpen },
];

const toolItems: NavItem[] = [
  { label: "AI asistent", icon: Bot, action: "assistant", pill: "Novo" },
  { href: "/dashboard/alerti", label: "Alerti & Pretrage", icon: Bell },
  { href: "/dashboard/watchlist", label: "Moje liste", icon: Bookmark },
  { href: "/dashboard/settings", label: "Postavke", icon: Settings },
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
  const [navCounts, setNavCounts] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(false);

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

  const sections = useMemo(
    () =>
      isAdmin
        ? [{ label: "Admin", items: adminItems }]
        : isAgency && activeClient
          ? [{ label: activeClient.name, items: clientNavItems }]
          : isAgency
            ? [{ label: "Glavno", items: agencyDefaultItems }]
            : [
                { label: "Glavno", items: mainItems.filter((item) => item.href !== "/dashboard/agency" || isAgency) },
                { label: "Aktivnost", items: activityItems },
                { label: "Alati", items: toolItems },
              ],
    [activeClient, agencyDefaultItems, clientNavItems, isAdmin, isAgency],
  );

  useEffect(() => {
    const routes = [
      "/dashboard",
      "/dashboard/tenders",
      "/dashboard/ponude",
      "/dashboard/bids",
      "/dashboard/watchlist",
      "/dashboard/trziste",
      "/dashboard/cpv",
      "/dashboard/pracenje",
      "/dashboard/alerti",
      "/dashboard/intelligence/competitors",
      "/dashboard/intelligence/upcoming",
      "/dashboard/vault",
      "/dashboard/prilike",
      "/dashboard/settings",
      "/dashboard/subscription",
      ...sections.flatMap((section) => section.items.map((item) => item.href).filter((href): href is string => Boolean(href))),
    ];
    [...new Set(routes)].forEach((route) => router.prefetch(route));
  }, [router, sections]);

  useEffect(() => {
    const toggleSidebar = () => setCollapsed((value) => !value);
    window.addEventListener("dashboard:toggle-sidebar", toggleSidebar);
    return () => window.removeEventListener("dashboard:toggle-sidebar", toggleSidebar);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.dashboardSidebar = collapsed ? "collapsed" : "expanded";
    return () => {
      delete document.documentElement.dataset.dashboardSidebar;
    };
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;

    async function loadNavCounts() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [{ count: alertsCount }, { data: companies }] = await Promise.all([
        supabase
          .from("saved_alerts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("enabled", true),
        supabase.from("companies").select("id").eq("user_id", user.id),
      ]);
      const companyIds = (companies ?? []).map((company) => company.id);
      let trackingCount = 0;
      let bidsCount = 0;

      if (companyIds.length > 0) {
        const [{ count: activeCount }, { count: totalBidsCount }] = await Promise.all([
          supabase
            .from("bids")
            .select("id", { count: "exact", head: true })
            .in("company_id", companyIds)
            .in("status", ["draft", "in_review", "submitted"]),
          supabase
            .from("bids")
            .select("id", { count: "exact", head: true })
            .in("company_id", companyIds),
        ]);
        trackingCount = activeCount ?? 0;
        bidsCount = totalBidsCount ?? 0;
      }

      if (!cancelled) {
        setNavCounts({
          "/dashboard/alerti": alertsCount ?? 0,
          "/dashboard/pracenje": trackingCount,
          "/dashboard/ponude": trackingCount,
          "/dashboard/bids": bidsCount,
        });
      }
    }

    loadNavCounts().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (item.action === "assistant") {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setMobileOpen(false);
            window.dispatchEvent(new Event("dashboard:open-assistant"));
          }}
          className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-purple-50 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <item.icon className="size-4 shrink-0 text-purple-500" />
          {!collapsed ? <span className="flex-1 truncate text-left">{item.label}</span> : null}
          {!collapsed && item.pill ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">{item.pill}</span> : null}
        </button>
      );
    }
    if (!item.href) return null;
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href);
    const count = navCounts[item.href];

    return (
      <Link key={item.href} href={item.href} prefetch onClick={() => setMobileOpen(false)} className="block">
        <span
          className={cn(
            "flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "border-blue-600 bg-blue-50 text-blue-600"
              : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950",
          )}
        >
          <item.icon className={cn("size-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
          {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
          {!collapsed && typeof count === "number" ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
          {!collapsed && item.pro ? (
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
        {!collapsed ? (
          <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-500">Plan</p>
            <p className="mt-1 text-sm font-bold text-slate-950">Premium plan</p>
            <Link href="/dashboard/subscription" className="mt-2 inline-flex text-xs font-bold text-blue-700">
              Upravljaj planom
            </Link>
          </div>
        ) : null}
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
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <UserAvatar userEmail={userEmail} />
            {!collapsed ? <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950" title={companyName ?? userEmail}>
                {companyName ?? userEmail.split("@")[0]}
              </p>
              <p className="truncate text-xs text-slate-500">Premium plan</p>
            </div> : null}
            {!collapsed ? <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", accountOpen && "rotate-180")} /> : null}
          </button>
        </div>
        {!collapsed ? (
          <Button type="button" variant="outline" onClick={() => setCollapsed(true)} className="mt-3 w-full rounded-xl">
            Sažmi meni
          </Button>
        ) : (
          <Button type="button" variant="outline" size="icon-lg" onClick={() => setCollapsed(false)} className="mt-3 w-full rounded-xl" aria-label="Proširi meni">
            <Menu className="size-4" />
          </Button>
        )}
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
              {!collapsed ? <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">{section.label}</p> : null}
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

      <MobileBottomNav navCounts={navCounts} onAssistantOpen={() => window.dispatchEvent(new Event("dashboard:open-assistant"))} />

      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-slate-200 bg-white shadow-[12px_0_32px_-28px_rgba(15,23,42,0.35)] transition-all lg:flex", collapsed ? "w-[84px]" : "w-[244px]")}>
        <div className={cn("py-6", collapsed ? "px-3" : "px-5")}>
          <TenderSistemLogo
            href={isAgency ? "/dashboard/agency" : "/dashboard"}
            size="sm"
            subtitle={collapsed ? undefined : isAdmin ? "Admin" : isAgency ? "Agencija" : "Pregled"}
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

function MobileBottomNav({
  navCounts,
  onAssistantOpen,
}: {
  navCounts: Record<string, number>;
  onAssistantOpen: () => void;
}) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
    { href: "/dashboard/ponude", label: "Pipeline", icon: Kanban, count: navCounts["/dashboard/ponude"] },
    { href: "/dashboard/pracenje", label: "Pracenje", icon: ListChecks, count: navCounts["/dashboard/pracenje"] },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.35)] backdrop-blur lg:hidden" aria-label="Mobilna navigacija">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                active ? "bg-blue-50 text-blue-600" : "text-slate-500",
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 ? (
                <span className="absolute right-2 top-1 rounded-full bg-blue-600 px-1.5 text-[9px] font-bold text-white">{item.count > 9 ? "9+" : item.count}</span>
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onAssistantOpen}
          className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-purple-600 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Bot className="size-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
