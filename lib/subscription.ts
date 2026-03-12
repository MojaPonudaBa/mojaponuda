import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/types/database";

export async function getSubscriptionStatus(userId: string): Promise<{
  isSubscribed: boolean;
  subscription: Subscription | null;
}> {
  const supabase = await createClient();

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
