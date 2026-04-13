import { NextResponse } from "next/server";
import { isAgencyPlanId } from "@/lib/agency";
import { resolveManagedCompanyAccess } from "@/lib/bids/access";
import { isDemoUser } from "@/lib/demo";
import { createCheckout } from "@/lib/lemonsqueezy";
import {
  getPreparationPacksForPlan,
  PLANS,
  PREPARATION_PACKS,
  type PlanTier,
  type PreparationPackId,
} from "@/lib/plans";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface CheckoutRequestBody {
  checkoutType?: "plan" | "preparation_pack";
  planId?: PlanTier;
  packId?: PreparationPackId;
  agencyClientId?: string | null;
}

function getSubscriptionRedirectUrl(agencyClientId?: string | null) {
  const base = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`;
  if (!agencyClientId) return `${base}#pripreme`;

  const params = new URLSearchParams({ agencyClientId });
  return `${base}?${params.toString()}#pripreme`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as CheckoutRequestBody;
    const checkoutType = body.checkoutType === "preparation_pack" ? "preparation_pack" : "plan";

    if (checkoutType === "preparation_pack") {
      const packId = body.packId;

      if (!packId || !(packId in PREPARATION_PACKS)) {
        return NextResponse.json({ error: "Nevažeći paket priprema." }, { status: 400 });
      }

      const subscriptionStatus = await getSubscriptionStatus(user.id, user.email, supabase);
      if (!subscriptionStatus.isSubscribed || subscriptionStatus.plan.id === "basic") {
        return NextResponse.json(
          {
            error: "Paketi priprema dostupni su samo uz aktivan Osnovni, Puni ili Agencijski paket.",
          },
          { status: 403 },
        );
      }

      const availablePacks = getPreparationPacksForPlan(subscriptionStatus.plan.id);
      const pack = availablePacks.find((item) => item.id === packId);
      if (!pack) {
        return NextResponse.json(
          {
            error: "Ovaj paket priprema nije dostupan za vaš trenutni plan.",
          },
          { status: 403 },
        );
      }

      const access = await resolveManagedCompanyAccess(supabase, user.id, body.agencyClientId ?? null);
      if (!access) {
        return NextResponse.json({ error: "Firma nije pronađena." }, { status: 403 });
      }

      if (isDemoUser(user.email)) {
        const admin = createAdminClient();
        const now = new Date().toISOString();

        const { error } = await admin.from("preparation_credit_purchases").insert({
          user_id: user.id,
          company_id: access.companyId,
          agency_client_id: access.agencyClientId,
          pack_id: pack.id,
          credits_granted: pack.credits,
          price_paid: pack.price,
          lemonsqueezy_order_id: `demo-prep-${Date.now()}`,
          lemonsqueezy_variant_id: pack.lemonSqueezyVariantId || pack.id,
          status: "paid",
          paid_at: now,
        });

        if (error) {
          throw error;
        }

        return NextResponse.json({
          url: access.agencyClientId
            ? `/dashboard/subscription?agencyClientId=${access.agencyClientId}#pripreme`
            : "/dashboard/subscription#pripreme",
        });
      }

      const storeId = process.env.LEMONSQUEEZY_STORE_ID;
      const variantId = pack.lemonSqueezyVariantId;
      if (!storeId || !variantId) {
        return NextResponse.json(
          { error: "Konfiguracija naplate za pakete priprema nije postavljena." },
          { status: 500 },
        );
      }

      const checkoutUrl = await createCheckout({
        storeId,
        variantId,
        userEmail: user.email ?? "",
        userId: user.id,
        redirectUrl: getSubscriptionRedirectUrl(access.agencyClientId),
        customData: {
          checkout_type: "preparation_pack",
          pack_id: pack.id,
          company_id: access.companyId,
          agency_client_id: access.agencyClientId ?? "",
        },
      });

      return NextResponse.json({ url: checkoutUrl });
    }

    const planId = body.planId;
    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: "Nevažeći plan." }, { status: 400 });
    }

    if (planId === "basic") {
      return NextResponse.json(
        {
          error:
            "Povratak na besplatni plan rješava se kroz portal za pretplatu ili podršku.",
        },
        { status: 400 },
      );
    }

    if (isAgencyPlanId(planId)) {
      return NextResponse.json(
        { error: "Agencijski paket nije dostupan kroz self-serve checkout." },
        { status: 403 },
      );
    }

    const plan = PLANS[planId];

    if (isDemoUser(user.email)) {
      const admin = createAdminClient();
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          lemonsqueezy_customer_id: "demo-customer",
          lemonsqueezy_subscription_id: "demo-subscription-id",
          lemonsqueezy_variant_id: planId,
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw error;
      }

      return NextResponse.json({ url: "/dashboard/subscription" });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = plan.lemonSqueezyVariantId;
    if (!storeId || !variantId) {
      return NextResponse.json(
        { error: "Konfiguracija naplate nije pronađena." },
        { status: 500 },
      );
    }

    const checkoutUrl = await createCheckout({
      storeId,
      variantId,
      userEmail: user.email ?? "",
      userId: user.id,
      customData: {
        checkout_type: "plan",
        plan_id: planId,
      },
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Checkout greška: ${message}` },
      { status: 500 },
    );
  }
}
