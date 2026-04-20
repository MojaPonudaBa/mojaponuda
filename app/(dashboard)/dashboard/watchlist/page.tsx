import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, FileBadge, Briefcase, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { unwatchEntityAction } from "@/app/actions/watchlist";

export const dynamic = "force-dynamic";

const entityLabel = {
  authority: { label: "Naručioci", icon: Building2, color: "text-blue-600", href: (key: string) => `/dashboard/intelligence/authority/${key}` },
  company: { label: "Dobavljači / konkurenti", icon: Briefcase, color: "text-purple-600", href: (key: string) => `/dashboard/intelligence/company/${key}` },
  cpv: { label: "CPV kategorije", icon: FileBadge, color: "text-emerald-600", href: (key: string) => `/dashboard/tenders?q=${encodeURIComponent(key)}` },
} as const;

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getWatchlist(user.id);

  const grouped: Record<WatchlistItem["entity_type"], WatchlistItem[]> = {
    authority: items.filter((i) => i.entity_type === "authority"),
    company: items.filter((i) => i.entity_type === "company"),
    cpv: items.filter((i) => i.entity_type === "cpv"),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight text-slate-900 sm:text-3xl">
          Praćenja
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Obavijestićemo vas čim se pojavi novi tender od praćenog naručioca ili u praćenoj CPV
          kategoriji. Praćene firme tretiramo kao konkurenciju — javljamo kad podnesu ponudu.
        </p>
      </div>

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
