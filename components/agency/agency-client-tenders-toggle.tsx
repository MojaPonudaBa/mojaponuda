"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

interface AgencyClientTendersToggleProps {
  clientId: string;
  showAllBiH: boolean;
}

export function AgencyClientTendersToggle({ clientId, showAllBiH }: AgencyClientTendersToggleProps) {
  const router = useRouter();

  function handleToggle() {
    const url = `/dashboard/agency/clients/${clientId}/tenders${showAllBiH ? "" : "?allBiH=true"}`;
    router.push(url);
  }

  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-colors hover:bg-slate-50">
      <input
        type="checkbox"
        checked={showAllBiH}
        onChange={handleToggle}
        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
      />
      <MapPin className="size-3.5 text-slate-400" />
      <span className="text-sm font-medium text-slate-700">Prikaži tendere iz cijele BiH</span>
    </label>
  );
}
