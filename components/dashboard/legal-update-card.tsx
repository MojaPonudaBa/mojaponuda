import { Scale, FileText, Newspaper, ExternalLink } from "lucide-react";

interface LegalUpdateCardProps {
  update: {
    id: string;
    type: string;
    title: string;
    summary: string | null;
    source: string;
    source_url: string | null;
    published_date: string | null;
  };
}

const TYPE_CONFIG = {
  zakon: { label: "Zakon", icon: Scale, color: "text-blue-700 bg-blue-50 border-blue-200" },
  izmjena: { label: "Izmjena", icon: FileText, color: "text-amber-700 bg-amber-50 border-amber-200" },
  vijest: { label: "Vijest", icon: Newspaper, color: "text-slate-700 bg-slate-100 border-slate-200" },
};

export function LegalUpdateCard({ update: u }: LegalUpdateCardProps) {
  const config = TYPE_CONFIG[u.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.vijest;
  const Icon = config.icon;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("bs-BA", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${config.color}`}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.color}`}>
              {config.label}
            </span>
            {u.published_date && (
              <span className="text-xs text-slate-400">{formatDate(u.published_date)}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900">{u.title}</p>
          {u.summary && (
            <p className="text-xs leading-5 text-slate-600 mt-1">{u.summary}</p>
          )}
          {u.source_url && (
            <a
              href={u.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Pročitaj original
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
