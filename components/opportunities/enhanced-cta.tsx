"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, FileText, ArrowRight } from "lucide-react";

export interface CTAConfig {
  primary_text: string;
  primary_action: "follow" | "signup" | "check_eligibility";
  secondary_text?: string;
  secondary_action?: "download_checklist" | "view_similar";
  outcome_message: string;
  signup_context?: {
    ref: string;
    opportunity_id: string;
    category: string;
  };
}

interface EnhancedCTAProps {
  opportunity: {
    id: string;
    slug: string;
    title: string;
    category: string | null;
    deadline: string | null;
    ai_difficulty: "lako" | "srednje" | "tesko" | null;
    status: string;
  };
  userLoggedIn: boolean;
  onFollow?: () => Promise<void>;
  className?: string;
}

/**
 * Generates outcome-focused CTA configuration
 * @param opportunity - Opportunity data
 * @param userLoggedIn - Whether user is authenticated
 * @returns CTA configuration for rendering
 */
export function generateCTAConfig(
  opportunity: {
    id: string;
    slug: string;
    category: string | null;
    deadline: string | null;
    ai_difficulty: "lako" | "srednje" | "tesko" | null;
    status: string;
  },
  userLoggedIn: boolean
): CTAConfig {
  const hasDeadline = !!opportunity.deadline;
  const isExpired = opportunity.status === "expired";
  const isDifficult = opportunity.ai_difficulty === "tesko";

  // Expired opportunity
  if (isExpired) {
    return {
      primary_text: "Pratite sljedeće slične prilike",
      primary_action: "view_similar",
      outcome_message: "Budite obaviješteni o novim prilika u ovoj kategoriji",
    };
  }

  // Not logged in - signup flow
  if (!userLoggedIn) {
    if (hasDeadline) {
      return {
        primary_text: "Automatski prati rok i dokumentaciju",
        primary_action: "signup",
        secondary_text: isDifficult ? "Dobij checklistu za prijavu" : undefined,
        secondary_action: isDifficult ? "download_checklist" : undefined,
        outcome_message:
          "Dobijte obavijesti o rokovima i ažuriranjima za ovu priliku",
        signup_context: {
          ref: "opportunity_cta",
          opportunity_id: opportunity.id,
          category: opportunity.category ?? "general",
        },
      };
    }

    return {
      primary_text: "Prati ovu priliku",
      primary_action: "signup",
      outcome_message: "Budite obaviješteni o ažuriranjima i sličnim prilikama",
      signup_context: {
        ref: "opportunity_cta",
        opportunity_id: opportunity.id,
        category: opportunity.category ?? "general",
      },
    };
  }

  // Logged in - follow flow
  if (hasDeadline) {
    return {
      primary_text: "Prati ovu priliku",
      primary_action: "follow",
      secondary_text: isDifficult ? "Dobij checklistu za prijavu" : "Vidi slične prilike",
      secondary_action: isDifficult ? "download_checklist" : "view_similar",
      outcome_message: "Dobijte obavijesti o rokovima i ažuriranjima",
    };
  }

  return {
    primary_text: "Prati ovu priliku",
    primary_action: "follow",
    secondary_text: "Vidi slične prilike",
    secondary_action: "view_similar",
    outcome_message: "Budite obaviješteni o ažuriranjima",
  };
}

/**
 * EnhancedCTA component with outcome-focused messaging
 */
export function EnhancedCTA({
  opportunity,
  userLoggedIn,
  onFollow,
  className = "",
}: EnhancedCTAProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followed, setFollowed] = useState(false);

  const config = generateCTAConfig(opportunity, userLoggedIn);

  const handlePrimaryAction = async () => {
    if (config.primary_action === "signup") {
      // Redirect to signup with context
      const params = new URLSearchParams({
        ref: config.signup_context?.ref ?? "opportunity_cta",
        opportunity_id: config.signup_context?.opportunity_id ?? "",
        category: config.signup_context?.category ?? "",
        redirect: `/prilike/${opportunity.slug}`,
      });
      router.push(`/signup?${params.toString()}`);
    } else if (config.primary_action === "follow") {
      if (onFollow) {
        setIsFollowing(true);
        try {
          await onFollow();
          setFollowed(true);
        } catch (error) {
          console.error("Failed to follow opportunity:", error);
        } finally {
          setIsFollowing(false);
        }
      }
    } else if (config.primary_action === "view_similar") {
      if (opportunity.category) {
        router.push(`/prilike/kategorija/${opportunity.category}`);
      } else {
        router.push("/prilike");
      }
    }
  };

  const handleSecondaryAction = () => {
    if (config.secondary_action === "download_checklist") {
      // TODO: Implement checklist download
      console.log("Download checklist");
    } else if (config.secondary_action === "view_similar") {
      if (opportunity.category) {
        router.push(`/prilike/kategorija/${opportunity.category}`);
      } else {
        router.push("/prilike");
      }
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      {/* Outcome message */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          {config.outcome_message}
        </p>
      </div>

      {/* Primary CTA */}
      <button
        onClick={handlePrimaryAction}
        disabled={isFollowing || followed}
        className={`
          w-full px-6 py-3 rounded-lg font-medium text-white
          flex items-center justify-center gap-2
          transition-colors
          ${
            followed
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {followed ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Pratite ovu priliku
          </>
        ) : (
          <>
            <Bell className="w-5 h-5" />
            {config.primary_text}
          </>
        )}
      </button>

      {/* Secondary CTA */}
      {config.secondary_text && config.secondary_action && (
        <button
          onClick={handleSecondaryAction}
          className="
            w-full mt-3 px-6 py-2 rounded-lg font-medium
            text-gray-700 dark:text-gray-300
            border border-gray-300 dark:border-gray-600
            hover:bg-gray-50 dark:hover:bg-gray-700
            flex items-center justify-center gap-2
            transition-colors
          "
        >
          {config.secondary_action === "download_checklist" ? (
            <FileText className="w-4 h-4" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {config.secondary_text}
        </button>
      )}
    </div>
  );
}
