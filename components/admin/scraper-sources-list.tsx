"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, PlayCircle, RefreshCw } from "lucide-react";
import { SCRAPER_SOURCES, type ScraperSource } from "@/sync/scrapers/scraper-registry";

interface ScraperLog {
  id: string;
  source: string;
  items_found: number;
  items_new: number;
  items_skipped: number;
  error: string | null;
  ran_at: string;
}

interface ScraperSourcesListProps {
  initialLogs: ScraperLog[];
}

interface ScraperStatus {
  loading: boolean;
  result?: {
    itemsFound: number;
    itemsNew: number;
    itemsSkipped: number;
    itemsFiltered?: number;
    itemsRejectedByAi?: number;
    filterReasons?: Record<string, number>;
    aiRejectReasons?: string[];
    duration_ms: number;
    errors?: string[];
  };
  error?: string;
}

export function ScraperSourcesList({ initialLogs }: ScraperSourcesListProps) {
  const [logs, setLogs] = useState<ScraperLog[]>(initialLogs);
  const [scraperStatus, setScraperStatus] = useState<Record<string, ScraperStatus>>({});
  const [selectedLayer, setSelectedLayer] = useState<"all" | "layer1" | "layer2" | "layer3">("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "opportunities" | "legal">("all");
  const [runningAll, setRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState({ done: 0, total: 0 });
  const [regenStatus, setRegenStatus] = useState<{ loading: boolean; message?: string } | null>(null);

  const handleRegenContent = async (limit = 20) => {
    setRegenStatus({ loading: true });
    try {
      const res = await fetch("/api/admin/regen-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const data = await res.json();
      setRegenStatus({ loading: false, message: data.message ?? data.error });
    } catch (err) {
      setRegenStatus({ loading: false, message: String(err) });
    }
  };

  const filteredSources = SCRAPER_SOURCES.filter((source) => {
    if (selectedLayer !== "all" && source.layer !== selectedLayer) return false;
    if (selectedCategory !== "all" && source.category !== selectedCategory) return false;
    return true;
  });

  const handleRunAll = async () => {
    const enabledSources = SCRAPER_SOURCES.filter((s) => s.enabled);
    setRunningAll(true);
    setRunAllProgress({ done: 0, total: enabledSources.length });

    for (let i = 0; i < enabledSources.length; i++) {
      const source = enabledSources[i];
      setRunAllProgress({ done: i, total: enabledSources.length });
      await handleScrape(source.id);
    }

    setRunAllProgress({ done: enabledSources.length, total: enabledSources.length });
    setRunningAll(false);
  };

  const handleScrape = async (sourceId: string) => {
    setScraperStatus((prev) => ({
      ...prev,
      [sourceId]: { loading: true },
    }));

    try {
      const response = await fetch("/api/admin/scrape-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri scrapanju");
      }

      setScraperStatus((prev) => ({
        ...prev,
        [sourceId]: {
          loading: false,
          result: {
            itemsFound: data.itemsFound,
            itemsNew: data.itemsNew,
            itemsSkipped: data.itemsSkipped,
            itemsFiltered: data.itemsFiltered,
            itemsRejectedByAi: data.itemsRejectedByAi,
            filterReasons: data.filterReasons,
            aiRejectReasons: data.aiRejectReasons,
            duration_ms: data.duration_ms,
            errors: data.errors,
          },
        },
      }));

      // Refresh logs
      const logsResponse = await fetch("/api/admin/scraper-logs");
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
      }
    } catch (error) {
      setScraperStatus((prev) => ({
        ...prev,
        [sourceId]: {
          loading: false,
          error: error instanceof Error ? error.message : "Nepoznata greška",
        },
      }));
    }
  };

  const getLastLog = (sourceId: string): ScraperLog | undefined => {
    return logs.find((log) => log.source.includes(sourceId));
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Upravo sada";
    if (diffMins < 60) return `Prije ${diffMins} min`;
    if (diffHours < 24) return `Prije ${diffHours}h`;
    if (diffDays < 7) return `Prije ${diffDays} dana`;
    return date.toLocaleDateString("bs-BA", { day: "numeric", month: "short", year: "numeric" });
  };

  const getLayerBadge = (layer: string) => {
    const colors = {
      layer1: "bg-green-100 text-green-800 border-green-200",
      layer2: "bg-blue-100 text-blue-800 border-blue-200",
      layer3: "bg-purple-100 text-purple-800 border-purple-200",
    };
    const labels = {
      layer1: "Dnevno",
      layer2: "Sedmično",
      layer3: "Mjesečno",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[layer as keyof typeof colors]}`}>
        {labels[layer as keyof typeof labels]}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      opportunities: "bg-amber-100 text-amber-800 border-amber-200",
      legal: "bg-slate-100 text-slate-800 border-slate-200",
    };
    const labels = {
      opportunities: "Prilike",
      legal: "Zakon",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[category as keyof typeof colors]}`}>
        {labels[category as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Run All + Regen */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRunAll}
          disabled={runningAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold shadow-sm"
        >
          {runningAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Pokrećem sve ({runAllProgress.done}/{runAllProgress.total})...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              Pokreni sve scrapere
            </>
          )}
        </button>

        <button
          onClick={() => handleRegenContent(30)}
          disabled={regenStatus?.loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold shadow-sm"
          title="Regeneriraj AI sadržaj (ai_content) za postojeće postove koji ga nemaju"
        >
          {regenStatus?.loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Regeneriram...</>
          ) : (
            <><RefreshCw className="w-4 h-4" />Regen AI sadržaj (30)
            </>
          )}
        </button>

        {regenStatus?.message && !regenStatus.loading && (
          <span className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5">
            {regenStatus.message}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLayer("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedLayer === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Svi layeri
          </button>
          <button
            onClick={() => setSelectedLayer("layer1")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedLayer === "layer1"
                ? "bg-green-600 text-white"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            Dnevno
          </button>
          <button
            onClick={() => setSelectedLayer("layer2")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedLayer === "layer2"
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Sedmično
          </button>
          <button
            onClick={() => setSelectedLayer("layer3")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedLayer === "layer3"
                ? "bg-purple-600 text-white"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            Mjesečno
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Sve kategorije
          </button>
          <button
            onClick={() => setSelectedCategory("opportunities")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedCategory === "opportunities"
                ? "bg-amber-600 text-white"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            }`}
          >
            Prilike
          </button>
          <button
            onClick={() => setSelectedCategory("legal")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedCategory === "legal"
                ? "bg-slate-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Zakon
          </button>
        </div>
      </div>

      {/* Sources list */}
      <div className="space-y-3">
        {filteredSources.map((source) => {
          const status = scraperStatus[source.id];
          const lastLog = getLastLog(source.id);

          return (
            <div
              key={source.id}
              className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{source.name}</h3>
                    {getLayerBadge(source.layer)}
                    {getCategoryBadge(source.category)}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{source.description}</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {source.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Last run info */}
                  {lastLog && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(lastLog.ran_at)}
                      </div>
                      <div>Pronađeno: {lastLog.items_found}</div>
                      <div>Novo: {lastLog.items_new}</div>
                      <div>Preskočeno: {lastLog.items_skipped}</div>
                      {lastLog.error && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" />
                          Greška
                        </div>
                      )}
                    </div>
                  )}

                  {/* Current scrape result */}
                  {status?.result && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">
                          Scrape završen ({formatDuration(status.result.duration_ms)})
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-slate-600">Pronađeno</div>
                          <div className="font-semibold text-slate-900">{status.result.itemsFound}</div>
                        </div>
                        <div>
                          <div className="text-slate-600">Novo</div>
                          <div className="font-semibold text-green-600">{status.result.itemsNew}</div>
                        </div>
                        <div>
                          <div className="text-slate-600">Preskočeno</div>
                          <div className="font-semibold text-slate-900">{status.result.itemsSkipped}</div>
                        </div>
                        {status.result.itemsFiltered !== undefined && (
                          <div>
                            <div className="text-slate-600">Filtrirano</div>
                            <div className="font-semibold text-amber-600">{status.result.itemsFiltered}</div>
                          </div>
                        )}
                      </div>
                      {status.result.errors && status.result.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600">
                          Greške: {status.result.errors.join(", ")}
                        </div>
                      )}
                      {status.result.filterReasons && Object.keys(status.result.filterReasons).length > 0 && (
                        <div className="mt-2 text-xs text-amber-700">
                          Razlozi filtriranja: {Object.entries(status.result.filterReasons).map(([r, n]) => `${r} (${n})`).join(", ")}
                        </div>
                      )}
                      {status.result.itemsRejectedByAi !== undefined && status.result.itemsRejectedByAi > 0 && (
                        <div className="mt-2 text-xs text-purple-700">
                          AI odbio: {status.result.itemsRejectedByAi} stavki
                          {status.result.aiRejectReasons && status.result.aiRejectReasons.length > 0 && (
                            <ul className="mt-1 ml-3 list-disc text-purple-600">
                              {status.result.aiRejectReasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {status?.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-900">{status.error}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrape button */}
                <button
                  onClick={() => handleScrape(source.id)}
                  disabled={status?.loading || !source.enabled}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {status?.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Pokreni scraper
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nema izvora za odabrane filtere
        </div>
      )}
    </div>
  );
}
