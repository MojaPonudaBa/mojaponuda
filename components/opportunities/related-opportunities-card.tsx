import Link from "next/link";
import { ArrowRight, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { UrgencyBadge } from "./urgency-banner";
import type { RelatedOpportunity } from "@/lib/related-opportunities-service";

interface RelatedOpportunitiesCardProps {
  opportunities: RelatedOpportunity[];
  categoryLink?: string;
  className?: string;
}

/**
 * RelatedOpportunitiesCard displays similar opportunities with context
 */
export function RelatedOpportunitiesCard({
  opportunities,
  categoryLink,
  className = "",
}: RelatedOpportunitiesCardProps) {
  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Slične prilike
        </h2>
        {categoryLink && (
          <Link
            href={categoryLink}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            Vidi sve
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {opportunities.map((opp) => (
          <Link
            key={opp.id}
            href={`/prilike/${opp.slug}`}
            className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
          >
            {/* Similarity reason */}
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {opp.similarity_reason}
              </span>
              {opp.deadline && <UrgencyBadge deadline={opp.deadline} />}
            </div>

            {/* Title */}
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
              {opp.title}
            </h3>

            {/* Issuer */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {opp.issuer}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {opp.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(opp.deadline).toLocaleDateString("bs-BA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}

              {opp.value && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{opp.value.toLocaleString("bs-BA")} KM</span>
                </div>
              )}

              {opp.ai_difficulty && (
                <div className="flex items-center gap-1">
                  <span
                    className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${
                        opp.ai_difficulty === "lako"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : opp.ai_difficulty === "srednje"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }
                    `}
                  >
                    {opp.ai_difficulty}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
