import Link from "next/link";
import { Building2, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import type { HistoricalContext } from "@/sync/historical-context-calculator";

interface IssuerHistoryCardProps {
  issuer: string;
  historicalContext: HistoricalContext;
  previousCalls?: Array<{
    id: string;
    slug: string;
    title: string;
    deadline: string | null;
    status: string;
  }>;
  className?: string;
}

/**
 * IssuerHistoryCard displays historical context about the issuer
 */
export function IssuerHistoryCard({
  issuer,
  historicalContext,
  previousCalls = [],
  className = "",
}: IssuerHistoryCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Drugi pozivi od {issuer}
        </h2>
      </div>

      {/* Historical Stats */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Poziva u zadnjih 12 mjeseci
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {historicalContext.issuer_calls_count}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Trend kategorije
            </p>
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`w-5 h-5 ${
                  historicalContext.category_trend === "increasing"
                    ? "text-green-600 dark:text-green-400"
                    : historicalContext.category_trend === "decreasing"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                }`}
              />
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {historicalContext.category_trend === "increasing"
                  ? "Rastući"
                  : historicalContext.category_trend === "decreasing"
                    ? "Opadajući"
                    : "Stabilan"}
              </p>
            </div>
          </div>
        </div>

        {/* Frequency Pattern */}
        {historicalContext.typical_frequency && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <span>{historicalContext.typical_frequency}</span>
            </p>
          </div>
        )}
      </div>

      {/* Previous Calls */}
      {previousCalls.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Prethodni pozivi
          </h3>
          <div className="space-y-3">
            {previousCalls.map((call) => (
              <Link
                key={call.id}
                href={`/prilike/${call.slug}`}
                className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2 flex-1">
                    {call.title}
                  </h4>
                  <span
                    className={`
                      px-2 py-0.5 rounded text-xs font-medium flex-shrink-0
                      ${
                        call.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                      }
                    `}
                  >
                    {call.status === "active" ? "Aktivan" : "Istekao"}
                  </span>
                </div>
                {call.deadline && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Rok:{" "}
                    {new Date(call.deadline).toLocaleDateString("bs-BA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* View all link */}
          <Link
            href={`/prilike?issuer=${encodeURIComponent(issuer)}`}
            className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Vidi sve pozive od {issuer}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
