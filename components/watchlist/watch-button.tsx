import { Eye, EyeOff } from "lucide-react";
import { watchEntityAction, unwatchEntityAction } from "@/app/actions/watchlist";
import type { WatchlistEntityType } from "@/lib/watchlist";

interface Props {
  entityType: WatchlistEntityType;
  entityKey: string;
  entityLabel?: string | null;
  isWatched: boolean;
  redirectTo?: string;
  size?: "sm" | "md";
}

export function WatchButton({ entityType, entityKey, entityLabel, isWatched, redirectTo, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  if (isWatched) {
    return (
      <form action={unwatchEntityAction}>
        <input type="hidden" name="entity_type" value={entityType} />
        <input type="hidden" name="entity_key" value={entityKey} />
        {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
        <button
          type="submit"
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-800 transition-colors hover:bg-emerald-100 ${sizeClass}`}
        >
          <EyeOff className="size-3.5" />
          Pratite
        </button>
      </form>
    );
  }

  return (
    <form action={watchEntityAction}>
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_key" value={entityKey} />
      {entityLabel && <input type="hidden" name="entity_label" value={entityLabel} />}
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 ${sizeClass}`}
      >
        <Eye className="size-3.5" />
        Prati
      </button>
    </form>
  );
}
