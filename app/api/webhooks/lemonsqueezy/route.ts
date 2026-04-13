import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";
import { getPreparationPackFromVariantId, PREPARATION_PACKS, type PreparationPackId } from "@/lib/plans";
import type { Database, PreparationCreditPurchaseInsert } from "@/types/database";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase service role config missing");
  }

  return createClient<Database>(url, key);
}

const SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
]);

const ORDER_EVENTS = new Set(["order_created"]);

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getCustomData(payload: Record<string, unknown>) {
  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  return (meta.custom_data ?? {}) as Record<string, unknown>;
}

function mapSubscriptionStatus(statusValue: string | null): string {
  switch (statusValue) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "paused":
      return "paused";
    case "unpaid":
      return "unpaid";
    default:
      return "inactive";
  }
}

async function handleSubscriptionEvent(
  supabase: ReturnType<typeof getAdminClient>,
  payload: Record<string, unknown>,
  eventName: string,
) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const attrs = (data.attributes ?? {}) as Record<string, unknown>;
  const customData = getCustomData(payload);

  const subscriptionId = asString(data.id);
  const customerId = asString(attrs.customer_id);
  const variantId = asString(attrs.variant_id);
  const userId = asString(customData.user_id);
  const status = mapSubscriptionStatus(asString(attrs.status));
  const currentPeriodEnd = asString(attrs.renews_at) ?? asString(attrs.ends_at);

  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing subscription id" }, { status: 400 });
  }

  if (eventName === "subscription_created") {
    if (!userId) {
      console.error("subscription_created: no user_id in custom_data");
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          lemonsqueezy_subscription_id: subscriptionId,
          lemonsqueezy_customer_id: customerId,
          lemonsqueezy_variant_id: variantId,
          status,
          current_period_end: currentPeriodEnd,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_customer_id: customerId,
        lemonsqueezy_variant_id: variantId,
        status,
        current_period_end: currentPeriodEnd,
      });
    }

    return NextResponse.json({ received: true, event: eventName });
  }

  await supabase
    .from("subscriptions")
    .update({
      status,
      lemonsqueezy_variant_id: variantId,
      current_period_end: currentPeriodEnd,
    })
    .eq("lemonsqueezy_subscription_id", subscriptionId);

  return NextResponse.json({ received: true, event: eventName });
}

async function handleOrderCreated(
  supabase: ReturnType<typeof getAdminClient>,
  payload: Record<string, unknown>,
) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const attrs = (data.attributes ?? {}) as Record<string, unknown>;
  const customData = getCustomData(payload);

  if (asString(customData.checkout_type) !== "preparation_pack") {
    return NextResponse.json({ received: true, skipped: "non-preparation-order" });
  }

  const orderId = asString(data.id);
  const userId = asString(customData.user_id);
  const companyId = asString(customData.company_id);
  const agencyClientId = asString(customData.agency_client_id);
  const packId = asString(customData.pack_id) as PreparationPackId | null;
  const variantId =
    asString(attrs.variant_id) ??
    asString((attrs.first_order_item as Record<string, unknown> | undefined)?.variant_id);

  const pack =
    (packId && packId in PREPARATION_PACKS ? PREPARATION_PACKS[packId] : null) ??
    getPreparationPackFromVariantId(variantId);

  if (!orderId || !userId || !companyId || !pack) {
    console.error("order_created: missing preparation pack data", {
      orderId,
      userId,
      companyId,
      packId,
      variantId,
    });
    return NextResponse.json({ error: "Missing preparation pack metadata" }, { status: 400 });
  }

  const paidAt = asString(attrs.created_at) ?? new Date().toISOString();
  const variantValue = variantId ?? pack.lemonSqueezyVariantId ?? null;

  const record: PreparationCreditPurchaseInsert = {
    user_id: userId,
    company_id: companyId,
    agency_client_id: agencyClientId,
    pack_id: pack.id,
    credits_granted: pack.credits,
    price_paid: pack.price,
    lemonsqueezy_order_id: orderId,
    lemonsqueezy_variant_id: variantValue,
    status: "paid",
    paid_at: paidAt,
  };

  const { data: existing } = await supabase
    .from("preparation_credit_purchases")
    .select("id")
    .eq("lemonsqueezy_order_id", orderId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("preparation_credit_purchases")
      .update(record)
      .eq("id", existing.id);
  } else {
    await supabase.from("preparation_credit_purchases").insert(record);
  }

  return NextResponse.json({ received: true, event: "order_created" });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  const eventName = asString(meta.event_name);

  if (!eventName) {
    return NextResponse.json({ error: "Missing event name" }, { status: 400 });
  }

  const supabase = getAdminClient();

  if (SUBSCRIPTION_EVENTS.has(eventName)) {
    return handleSubscriptionEvent(supabase, payload, eventName);
  }

  if (ORDER_EVENTS.has(eventName)) {
    return handleOrderCreated(supabase, payload);
  }

  return NextResponse.json({ received: true, skipped: eventName });
}
