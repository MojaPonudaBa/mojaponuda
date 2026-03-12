import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/types/database";
import { SubscriptionCard } from "@/components/subscription/subscription-card";

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const subscription = subData as Subscription | null;

  const isActive =
    subscription?.status === "active" || subscription?.status === "past_due";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pretplata</h1>
        <p className="text-sm text-muted-foreground">
          Upravljajte svojom pretplatom na MojaPonuda.ba
        </p>
      </div>

      <SubscriptionCard
        isActive={isActive}
        status={subscription?.status ?? "inactive"}
        currentPeriodEnd={subscription?.current_period_end ?? null}
        hasCustomerId={!!subscription?.lemonsqueezy_customer_id}
      />
    </div>
  );
}
