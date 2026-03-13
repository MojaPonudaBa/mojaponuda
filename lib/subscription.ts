import { createClient } from "@/lib/supabase/server";
import { getDemoSubscription, isDemoUser } from "@/lib/demo";
import type { Subscription } from "@/types/database";
import { DEFAULT_PLAN, getPlanFromVariantId, type Plan, PLANS } from "@/lib/plans";

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
    // Ako admin ima pretplatu u bazi, koristi nju da bi se mogao prebacivati između paketa
    if (subscription) {
      const plan = getPlanFromVariantId(subscription.lemonsqueezy_variant_id || null);
      return {
        isSubscribed: true,
        subscription,
        plan,
      };
    }

    // Default za admina ako nema ništa u bazi je Agencijski paket
    const demoSub = getDemoSubscription(userId);
    const agencyPlan = PLANS.agency;
    demoSub.lemonsqueezy_variant_id = "agency";

    return {
      isSubscribed: true,
      subscription: demoSub,
      plan: agencyPlan,
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
