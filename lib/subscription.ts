import { createClient } from "@/lib/supabase/server";
import { getDemoSubscription, isDemoUser } from "@/lib/demo";
import type { Subscription } from "@/types/database";
import { DEFAULT_PLAN, getPlanFromVariantId, type Plan, PLANS } from "@/lib/plans";

const COMPLIMENTARY_PRO_EMAILS = ["marin.kolenda@outlook.com"];

function hasComplimentaryProAccess(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? COMPLIMENTARY_PRO_EMAILS.includes(normalizedEmail) : false;
}

export type SubscriptionStatus = {
  isSubscribed: boolean;
  subscription: Subscription | null;
  plan: Plan;
};

export async function getSubscriptionStatus(
  userId: string,
  email?: string | null
): Promise<SubscriptionStatus> {
  const supabase = await createClient();

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
    : DEFAULT_PLAN; // Free users get default (basic) plan limits but are not "subscribed" in terms of payment status if we had a free tier, but here Basic is paid.
    // Wait, the user requirements say:
    // OSNOVNI PAKET: 50 KM.
    // So if they are NOT subscribed, they probably shouldn't have access to paid features.
    // However, for the purpose of "limits", a non-subscribed user effectively has NO plan or a "Free" plan with 0 limits?
    // The requirement says: "Sustav mora podržavati tri paketa." (Basic, Full, Agency).
    // It doesn't explicitly mention a "Free" tier, but usually there is one or they are blocked.
    // If isSubscribed is false, they are likely redirected to pricing.
    // But for the sake of returning a valid Plan object, let's return a "Free" plan or Basic plan with strict flags.
    // Actually, looking at the code, if !isSubscribed, they are often redirected.
    // Let's stick to returning DEFAULT_PLAN (Basic) as a fallback for type safety, but the isSubscribed flag handles access.
    
  return { isSubscribed, subscription, plan };
}
