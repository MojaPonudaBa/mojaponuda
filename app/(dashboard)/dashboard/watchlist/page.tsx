import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Bell, Building2, CalendarClock, FileBadge, Briefcase, Eye, Radar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { unwatchEntityAction } from "@/app/actions/watchlist";

export const dynamic = "force-dynamic";

const entityLabel = {
  authority: { label: "Naručioci", icon: Building2, color: "text-blue-600", href: (key: string) => `/dashboard/intelligence/authority/${key}` },
  company: { label: "Dobavljači / konkurenti", icon: Briefcase, color: "text-sky-600", href: (key: string) => `/dashboard/intelligence/company/${key}` },
  cpv: { label: "CPV kategorije", icon: FileBadge, color: "text-emerald-600", href: (key: string) => `/dashboard/tenders?q=${encodeURIComponent(key)}` },
} as const;

interface SignalNotification {
  id: string;
  event_type: string;
  subject: string;
  body_text: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

function signalMeta(eventType: string) {
  if (eventType.includes("planned_procurement")) {
    return { label: "Rani signal", icon: CalendarClock, tone: "text-blue-600 bg-blue-50 border-blue-100" };
  }
  if (eventType.includes("competitor")) {
    return { label: "Konkurencija", icon: Radar, tone: "text-amber-700 bg-amber-50 border-amber-100" };
  }
  if (eventType.includes("risk")) {
    return { label: "Rizik", icon: AlertTriangle, tone: "text-rose-700 bg-rose-50 border-rose-100" };
  }
  return { label: "Signal", icon: Bell, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" };
}

function signalHref(signal: SignalNotification): string | null {
  const payload = signal.payload ?? {};
  if (typeof payload.tenderId === "string") return `/dashboard/tenders/${payload.tenderId}`;
  if (typeof payload.competitorJib === "string") return `/dashboard/intelligence/company/${payload.competitorJib}`;
  if (typeof payload.authorityJib === "string") return `/dashboard/intelligence/authority/${payload.authorityJib}`;
  if (typeof payload.cpvPrefix === "string") return `/dashboard/tenders?q=${encodeURIComponent(payload.cpvPrefix)}`;
  return null;
}

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.round(diff / 3_600_000));
  if (hours < 1) return "upravo";
  if (hours < 24) return `prije ${hours}h`;
  return `prije ${Math.round(hours / 24)}d`;
}

function signalWhy(signal: SignalNotification): string | null {
  const why = signal.payload?.why;
  return typeof why === "string" && why.trim().length > 0 ? why : null;
}

function signalPriority(signal: SignalNotification): number {
  const importance = signal.payload?.importance === "high" ? 60 : signal.payload?.importance === "medium" ? 35 : 10;
  const freshness = signal.read_at ? 0 : 15;
  const typeBoost = signal.event_type.includes("decision")
    ? 25
    : signal.event_type.includes("competitor")
      ? 20
      : signal.event_type.includes("planned_procurement")
        ? 18
        : signal.event_type.includes("risk")
          ? 22
          : 5;
  return importance + freshness + typeBoost;
}

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getWatchlist(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: signalRows } = await (supabase as any)
    .from("notifications")
    .select("id, event_type, subject, body_text, payload, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);
  const signals = (signalRows ?? []) as SignalNotification[];

  const grouped: Record<WatchlistItem["entity_type"], WatchlistItem[]> = {
    authority: items.filter((i) => i.entity_type === "authority"),
    company: items.filter((i) => i.entity_type === "company"),
    cpv: items.filter((i) => i.entity_type === "cpv"),
  };
  const topSignal = [...signals].sort((a, b) => signalPriority(b) - signalPriority(a))[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight text-slate-900 sm:text-3xl">
          Praćenja
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Ovo je vaš radar: novi planovi, promjene kod naručilaca, potezi konkurenata i signali odluke koje ne biste trebali propustiti.
        </p>
      </div>

      {topSignal ? (() => {
        const meta = signalMeta(topSignal.event_type);
        const Icon = meta.icon;
        const href = signalHref(topSignal);
        const why = signalWhy(topSignal);
        const body = (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm transition-colors hover:bg-blue-100/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-blue-700">
                      Najvažniji signal danas
                    </span>
                    <span className="text-xs font-semibold text-blue-700">{timeAgo(topSignal.created_at)}</span>
                  </div>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold">{topSignal.subject}</h2>
                  {topSignal.body_text ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-blue-800">{topSignal.body_text}</p>
                  ) : null}
                  {why ? (
                    <p className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium leading-6 text-blue-900">
                      Zašto je bitno: {why}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold">Otvori signal</span>
            </div>
          </div>
        );
        return href ? <Link href={href}>{body}</Link> : body;
      })() : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Signalni tok</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Najnovije promjene iz praćenih naručilaca, kategorija, konkurenata i sistema preporuka.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {signals.length}
          </span>
        </div>
        {signals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell className="mx-auto size-9 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">Još nema signala</p>
            <p className="mt-1 text-xs text-slate-500">
              Dodajte naručioce, CPV kategorije ili konkurente u praćenje; dnevni cron će ovdje upisivati promjene.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {signals.map((signal) => {
              const meta = signalMeta(signal.event_type);
              const Icon = meta.icon;
              const href = signalHref(signal);
              const why = signalWhy(signal);
              const content = (
                <div className="flex gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
                  <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
                      {!signal.read_at ? <span className="size-1.5 rounded-full bg-blue-600" /> : null}
                      <span className="text-xs text-slate-400">{timeAgo(signal.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900">{signal.subject}</p>
                    {signal.body_text ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{signal.body_text}</p>
                    ) : null}
                    {why ? (
                      <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium leading-5 text-blue-800">
                        Zašto je bitno: {why}
                      </p>
                    ) : null}
                  </div>
                </div>
              );

              return href ? (
                <Link key={signal.id} href={href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={signal.id}>{content}</div>
              );
            })}
          </div>
        )}
      </section>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Eye className="mx-auto size-10 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">
            Još ništa ne pratite. Otvorite tender ili profil naručioca i kliknite <em>Prati</em>.
          </p>
        </div>
      )}

      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((type) => {
        const meta = entityLabel[type];
        const list = grouped[type];
        if (list.length === 0) return null;
        const Icon = meta.icon;
        return (
          <section key={type} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Icon className={`size-5 ${meta.color}`} />
              <h2 className="text-base font-semibold text-slate-900">{meta.label}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{list.length}</span>
            </div>

            <ul className="divide-y divide-slate-200">
              {list.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={meta.href(item.entity_key)} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 hover:text-blue-700">
                      {item.entity_label ?? item.entity_key}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {type === "cpv" ? `CPV ${item.entity_key}` : `JIB ${item.entity_key}`}
                    </div>
                  </Link>

                  <form action={unwatchEntityAction}>
                    <input type="hidden" name="entity_type" value={item.entity_type} />
                    <input type="hidden" name="entity_key" value={item.entity_key} />
                    <input type="hidden" name="redirect_to" value="/dashboard/watchlist" />
                    <button
                      type="submit"
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      Ukloni
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
