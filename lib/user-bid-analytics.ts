/**
 * Analitika korisničkih ponuda — win rate, trend, top authorities, top CPV.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface UserBidStats {
  totalBids: number;
  totalWins: number;
  winRate: number | null;
  totalWonValue: number;
  monthlyTrend: Array<{ month: string; winRate: number | null; wins: number; total: number }>;
  topAuthorities: Array<{ name: string; count: number }>;
  topCpvByWinRate: Array<{ cpv: string; winRate: number; sample: number }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function getUserBidStats(companyId: string): Promise<UserBidStats> {
  const supabase: AnyClient = createAdminClient();

  const { data: bids } = await supabase
    .from("bids")
    .select("id, status, bid_value, created_at, submitted_at, tenders(contracting_authority, cpv_code)")
    .eq("company_id", companyId)
    .limit(5000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = bids ?? [];

  const decidedStatuses = new Set(["won", "lost"]);
  const totalBids = rows.length;
  const winRows = rows.filter((r) => r.status === "won");
  const totalWins = winRows.length;
  const decided = rows.filter((r) => decidedStatuses.has(r.status));
  const winRate = decided.length > 0 ? Math.round((totalWins / decided.length) * 1000) / 10 : null;
  const totalWonValue = winRows.reduce((s, r) => s + Number(r.bid_value ?? 0), 0);

  // Monthly trend (zadnjih 6 mj) — win rate po mjesecu (samo decided)
  const monthBuckets = new Map<string, { wins: number; total: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets.set(key, { wins: 0, total: 0 });
  }
  for (const r of decided) {
    const when = r.submitted_at ?? r.created_at;
    if (!when) continue;
    const d = new Date(when);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthBuckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (r.status === "won") bucket.wins += 1;
  }
  const monthlyTrend = [...monthBuckets.entries()].map(([month, v]) => ({
    month,
    wins: v.wins,
    total: v.total,
    winRate: v.total > 0 ? Math.round((v.wins / v.total) * 1000) / 10 : null,
  }));

  // Top authorities po broju nastupa
  const authCounter = new Map<string, number>();
  for (const r of rows) {
    const t = Array.isArray(r.tenders) ? r.tenders[0] : r.tenders;
    const name = t?.contracting_authority;
    if (!name) continue;
    authCounter.set(name, (authCounter.get(name) ?? 0) + 1);
  }
  const topAuthorities = [...authCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  // Top CPV po win rateu (samo kategorije s ≥ 2 decided)
  const cpvBuckets = new Map<string, { wins: number; total: number }>();
  for (const r of decided) {
    const t = Array.isArray(r.tenders) ? r.tenders[0] : r.tenders;
    const prefix = (t?.cpv_code ?? "").toString().replace(/[^0-9]/g, "").slice(0, 3);
    if (!prefix) continue;
    const b = cpvBuckets.get(prefix) ?? { wins: 0, total: 0 };
    b.total += 1;
    if (r.status === "won") b.wins += 1;
    cpvBuckets.set(prefix, b);
  }
  const topCpvByWinRate = [...cpvBuckets.entries()]
    .filter(([, v]) => v.total >= 2)
    .map(([cpv, v]) => ({ cpv, winRate: Math.round((v.wins / v.total) * 1000) / 10, sample: v.total }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 3);

  return {
    totalBids,
    totalWins,
    winRate,
    totalWonValue,
    monthlyTrend,
    topAuthorities,
    topCpvByWinRate,
  };
}
