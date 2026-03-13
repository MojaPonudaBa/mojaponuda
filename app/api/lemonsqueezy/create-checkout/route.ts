import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckout } from "@/lib/lemonsqueezy";
import { PLANS, type PlanTier } from "@/lib/plans";
import { isDemoUser } from "@/lib/demo";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const planId = body.planId as PlanTier;

    if (!planId || !PLANS[planId]) {
      return NextResponse.json(
        { error: "Nevažeći plan." },
        { status: 400 }
      );
    }

    const plan = PLANS[planId];
    const variantId = plan.lemonSqueezyVariantId;

    // Za admin/demo nalog, direktno ažuriramo pretplatu bez plaćanja
    if (isDemoUser(user.email)) {
      const admin = createAdminClient();
      const { error } = await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            lemonsqueezy_customer_id: "demo-customer",
            lemonsqueezy_subscription_id: "demo-subscription-id",
            // Za demo korisnika spremamo planId direktno da ne ovisimo o LS variant ID env varovima
            lemonsqueezy_variant_id: planId,
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        throw error;
      }

      // Vraćamo URL na koji će klijent napraviti redirect
      return NextResponse.json({ url: "/dashboard/subscription" });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!storeId || !variantId) {
      console.error("Missing configuration:", { storeId, variantId, planId });
      return NextResponse.json(
        { error: "Konfiguracija naplate nije pronađena." },
        { status: 500 }
      );
    }

    const checkoutUrl = await createCheckout({
      storeId,
      variantId,
      userEmail: user.email ?? "",
      userId: user.id,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Checkout greška: ${message}` },
      { status: 500 }
    );
  }
}
