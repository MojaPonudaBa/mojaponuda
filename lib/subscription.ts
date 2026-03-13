import { createClient } from "@/lib/supabase/server";
import { getDemoSubscription, isDemoUser } from "@/lib/demo";
import type { Subscription } from "@/types/database";

export async function getSubscriptionStatus(userId: string, email?: string | null): Promise<{
  isSubscribed: boolean;
  subscription: Subscription | null;
}> {
  const supabase = await createClient();

  if (isDemoUser(email)) {
    return {
      isSubscribed: true,
      subscription: getDemoSubscription(userId),
    };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const subscription = data as Subscription | null;
  const isSubscribed =
    subscription?.status === "active" || subscription?.status === "past_due";

  return { isSubscribed, subscription };
}
