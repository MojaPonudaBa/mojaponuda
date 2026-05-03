"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bot, ChevronRight, HelpCircle, Menu, Search, Sparkles, UserCircle } from "lucide-react";
import { AIAssistantPanel } from "@/components/assistant/ai-assistant-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { globalDashboardSearchAction, type GlobalSearchResult } from "@/app/actions/dashboard";
import { cn } from "@/lib/utils";

interface DashboardAssistantProviderProps {
  userEmail: string;
  companyName?: string | null;
}

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  tenders: "Tenderi",
  ponude: "Pipeline",
  bids: "Ponude",
  pracenje: "Praćenje",
  vault: "Dokumentacija",
  settings: "Postavke",
  trziste: "Analize i izvještaji",
  cpv: "CPV klasifikacija",
  agency: "Klijenti",
  watchlist: "Moje liste",
};

function buildBreadcrumb(pathname: string) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => labelMap[segment] ?? segment.replaceAll("-", " "));
}

export function DashboardAssistantProvider({ userEmail, companyName }: DashboardAssistantProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const breadcrumb = useMemo(() => buildBreadcrumb(pathname ?? "/dashboard"), [pathname]);

  useEffect(() => {
    const openAssistant = () => setAssistantOpen(true);
    window.addEventListener("dashboard:open-assistant", openAssistant);
    return () => window.removeEventListener("dashboard:open-assistant", openAssistant);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "?" && !isTyping) {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    if (query.trim().length < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const nextResults = await globalDashboardSearchAction(query);
        setResults(nextResults);
      });
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query, searchOpen]);

  const visibleResults = query.trim().length < 2 ? [] : results;

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Sažmi bočni meni"
          onClick={() => window.dispatchEvent(new Event("dashboard:toggle-sidebar"))}
          className="outline-primary focus-visible:outline-2"
        >
          <Menu className="size-5" />
        </Button>

        <nav className="flex min-w-0 items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
          {breadcrumb.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0" /> : null}
              <span className={cn("truncate", index === breadcrumb.length - 1 && "font-semibold text-slate-900")}>{item}</span>
            </span>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mx-auto flex h-10 w-full max-w-[480px] items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 text-left text-sm text-slate-500 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Search className="size-4 text-slate-400" />
          <span className="flex-1">Pretraži tendere, naručioce, CPV i dokumente...</span>
          <kbd className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-400">/</kbd>
        </button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Obavještenja" className="outline-primary focus-visible:outline-2">
            <Bell className="size-5" />
          </Button>
          <Button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="rounded-full bg-purple-600 px-4 font-bold text-white hover:bg-purple-700"
          >
            <Sparkles className="size-4" />
            AI asistent
          </Button>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <UserCircle className="size-5 text-slate-400" />
            <span className="max-w-[140px] truncate">{companyName ?? userEmail}</span>
          </Link>
        </div>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-100 px-5 py-4">
            <DialogTitle>Globalna pretraga</DialogTitle>
            <DialogDescription>Pretražite tendere, naručioce, CPV kodove i dokumente.</DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Unesite najmanje 2 karaktera..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
            <div className="mt-4 min-h-56 space-y-2">
              {isPending ? <p className="text-sm text-slate-500">Pretražujem...</p> : null}
              {!isPending && query.trim().length >= 2 && visibleResults.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Nema rezultata za ovaj pojam.</p>
              ) : null}
              {visibleResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(result.href);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">{result.title}</span>
                    <span className="block truncate text-xs text-slate-500">{result.subtitle}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">{result.type}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prečice</DialogTitle>
            <DialogDescription>Brze tipke dostupne u dashboardu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Otvori globalnu pretragu</span><kbd>/</kbd></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Otvori ovu pomoć</span><kbd>?</kbd></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>AI asistent</span><Bot className="size-4 text-purple-600" /></div>
          </div>
        </DialogContent>
      </Dialog>

      <AIAssistantPanel
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        screenContext={pathname ?? "/dashboard"}
        userContext={{ userEmail, companyName }}
        className="border-purple-200"
      />
      <button
        type="button"
        onClick={() => setShortcutsOpen(true)}
        className="fixed bottom-4 right-4 z-40 hidden size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary lg:flex"
        aria-label="Otvori prečice"
      >
        <HelpCircle className="size-5" />
      </button>
    </>
  );
}
