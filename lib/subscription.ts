import { createClient } from "@/lib/supabase/server";
import { getDemoSubscription, isDemoUser } from "@/lib/demo";
import type { Subscription } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PLAN, getPlanFromVariantId, type Plan, PLANS } from "@/lib/plans";

// Configurable via COMPLIMENTARY_PRO_EMAILS env var (comma-separated).
const FALLBACK_COMPLIMENTARY_PRO_EMAILS = ["marin.kolenda@outlook.com"];

function getComplimentaryProEmails(): string[] {
  const envEmails = process.env.COMPLIMENTARY_PRO_EMAILS;
  if (!envEmails?.trim()) return FALLBACK_COMPLIMENTARY_PRO_EMAILS;
  return envEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function hasComplimentaryProAccess(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? getComplimentaryProEmails().includes(normalizedEmail) : false;
}

export type SubscriptionStatus = {
  isSubscribed: boolean;
  subscription: Subscription | null;
  plan: Plan;
};

/**
 * Returns the subscription status for a user.
 *
 * @param userId  The authenticated user's ID.
 * @param email   The authenticated user's email (optional, used for complimentary access).
 * @param client  An optional pre-existing Supabase client. If not provided, a new one is
 *                created. Pass the caller's client to avoid an extra connection overhead.
 */
export async function getSubscriptionStatus(
  userId: string,
  email?: string | null,
  client?: SupabaseClient
): Promise<SubscriptionStatus> {
  const supabase = client ?? (await createClient());

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const subscription = data as Subscription | null;

  if (isDemoUser(email)) {
    if (subscription) {
      const resolvedPlan = getPlanFromVariantId(subscription.lemonsqueezy_variant_id || null);
      const plan = resolvedPlan.id === "basic" ? PLANS.pro : resolvedPlan;
      return {
        isSubscribed: true,
        subscription,
        plan,
      };
    }

    const demoSub = getDemoSubscription(userId);
    const proPlan = PLANS.pro;
    demoSub.lemonsqueezy_variant_id = "pro";

    return {
      isSubscribed: true,
      subscription: demoSub,
      plan: proPlan,
    };
  }

  if (hasComplimentaryProAccess(email)) {
    return {
      isSubscribed: true,
      subscription,
      plan: PLANS.pro,
    };
  }

  const isSubscribed =
    subscription?.status === "active" || subscription?.status === "past_due";

  const plan = isSubscribed
    ? getPlanFromVariantId(subscription?.lemonsqueezy_variant_id || null)
    : DEFAULT_PLAN;

  return { isSubscribed, subscription, plan };
}

