"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from "lucide-react";

interface QualityStats {
  total_published: number;
  total_rejected: number;
  average_quality_score: number;
  low_quality_count: number;
  validation_failures: number;
}

interface LowQualityOpportunity {
  id: string;
  slug: string;
  title: string;
  issuer: string;
  content_quality_score: number;
  source_validated: boolean;
  source_validation_error: string | null;
  ai_content: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface ContentQualityDashboardProps {
  stats: QualityStats;
  lowQualityOpportunities: LowQualityOpportunity[];
  onRefresh?: () => void;
}

/**
 * ContentQualityDashboard displays quality metrics and low-quality opportunities
 */
export function ContentQualityDashboard({
  stats,
  lowQualityOpportunities,
  onRefresh,
}: ContentQualityDashboardProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Content Quality Monitoring
        </h1>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Published */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Published
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.total_published}
          </p>
        </div>

        {/* Total Rejected */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Rejected
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.total_rejected}
          </p>
        </div>

        {/* Average Quality Score */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Quality Score
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.average_quality_score.toFixed(0)}
          </p>
        </div>

        {/* Low Quality Count */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Low Quality (&lt;70)
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.low_quality_count}
          </p>
        </div>
      </div>

      {/* Low Quality Opportunities List */}
      {lowQualityOpportunities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Low Quality Opportunities (Score &lt; 70)
          </h2>

          <div className="space-y-4">
            {lowQualityOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {opp.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {opp.issuer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${
                          opp.content_quality_score >= 50
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }
                      `}
                    >
                      Score: {opp.content_quality_score}
                    </span>
                  </div>
                </div>

                {/* Quality Issues */}
                <div className="space-y-2">
                  {!opp.source_validated && (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Source validation failed:</span>{" "}
                        {opp.source_validation_error ?? "Unknown error"}
                      </div>
                    </div>
                  )}

                  {!opp.ai_content && (
                    <div className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Nedostaje automatski sadržaj</span>
                    </div>
                  )}

                  {!opp.seo_title && (
                    <div className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Missing SEO title</span>
                    </div>
                  )}

                  {!opp.seo_description && (
                    <div className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Missing SEO description</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={`/prilike/${opp.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </a>
                  <button
                    onClick={() => setSelectedOpportunity(opp.id)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Failures */}
      {stats.validation_failures > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Source Validation Failures
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {stats.validation_failures} opportunities have failed source validation.
                Review and correct source URLs in the admin panel.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
