import { TrendingUp, Users, Target, AlertCircle, CheckCircle } from "lucide-react";
import type { DecisionSupport } from "@/sync/decision-analyzer";

interface DecisionSupportCardProps {
  decisionSupport: DecisionSupport;
  className?: string;
}

/**
 * DecisionSupportCard displays competition analysis and success probability
 */
export function DecisionSupportCard({
  decisionSupport,
  className = "",
}: DecisionSupportCardProps) {
  const competitionColor =
    decisionSupport.competition_level === "niska"
      ? "text-green-600 dark:text-green-400"
      : decisionSupport.competition_level === "srednja"
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const successColor =
    decisionSupport.success_probability === "visoka"
      ? "text-green-600 dark:text-green-400"
      : decisionSupport.success_probability === "srednja"
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        Koliko je ovo dobra prilika?
      </h2>

      {/* Recommendation */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              {decisionSupport.recommendation}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {decisionSupport.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Competition Level */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Konkurencija
            </span>
          </div>
          <p className={`text-2xl font-bold ${competitionColor} capitalize`}>
            {decisionSupport.competition_level}
          </p>
          {decisionSupport.estimated_applicants && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              ~{decisionSupport.estimated_applicants} prijavitelja
            </p>
          )}
        </div>

        {/* Success Probability */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Šansa za uspjeh
            </span>
          </div>
          <p className={`text-2xl font-bold ${successColor} capitalize`}>
            {decisionSupport.success_probability}
          </p>
        </div>
      </div>

      {/* Typical Mistakes */}
      {decisionSupport.typical_mistakes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Tipične greške pri prijavi
            </h3>
          </div>
          <ul className="space-y-2">
            {decisionSupport.typical_mistakes.map((mistake, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5">
                  •
                </span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
