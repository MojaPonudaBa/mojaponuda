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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Upravljanje Pretplatom</h1>
        <p className="mt-2 text-base text-slate-500">
          Pregled statusa vaše licence i dostupnih funkcionalnosti.
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
