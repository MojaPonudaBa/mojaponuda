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
  Building2,
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
  { href: "/dashboard/vault", label: "Dokumenti", icon: FileText },
  { href: "/dashboard/bids", label: "Ponude", icon: Briefcase },
  { href: "/dashboard/tenders", label: "Tenderi", icon: Search },
];

const intelligenceItems: NavItem[] = [
  { href: "/dashboard/intelligence", label: "Tržišni pregled", icon: BarChart3, pro: true },
  { href: "/dashboard/intelligence/competitors", label: "Konkurenti", icon: Swords, pro: true },
  { href: "/dashboard/intelligence/upcoming", label: "Planirani tenderi", icon: Calendar, pro: true },
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
      <Link href={item.href}>
        <span
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
            isActive
              ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          )}
        >
          <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
              isActive
                ? "bg-primary/20 text-primary"
                : "bg-sidebar-accent text-sidebar-foreground/40"
            )}>
              Pro
            </span>
          )}
          {isActive && <ChevronRight className="size-3 text-primary/60" />}
        </span>
      </Link>
    );
  }

  return (
    <aside className="flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
            MojaPonuda<span className="text-primary">.ba</span>
          </h1>
          {companyName && (
            <p className="truncate text-[11px] text-muted-foreground">
              {companyName}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-sidebar-border" />

      {/* Core Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">
            Upravljanje
          </p>
          <div className="space-y-0.5">
            {coreItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">
            Inteligencija
          </p>
          <div className="space-y-0.5">
            {intelligenceItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">
            Nalog
          </p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
            {(userEmail?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-sidebar-foreground/80">
              {userEmail}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-3 text-[13px] text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Odjava
        </Button>
      </div>
    </aside>
  );
}
