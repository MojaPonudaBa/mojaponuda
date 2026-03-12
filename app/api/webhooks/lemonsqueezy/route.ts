import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client — webhook nema user sesiju
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role config missing");
  return createClient<Database>(url, key);
}

interface WebhookEventMeta {
  event_name: string;
  custom_data?: {
    user_id?: string;
  };
}

interface SubscriptionAttributes {
  customer_id: number;
  variant_id: number;
  status: string;
  renews_at: string | null;
  ends_at: string | null;
  first_subscription_item?: {
    subscription_id: number;
  };
}

interface WebhookPayload {
  meta: WebhookEventMeta;
  data: {
    id: string;
    attributes: SubscriptionAttributes;
  };
}

const HANDLED_EVENTS = [
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
] as const;

type HandledEvent = (typeof HANDLED_EVENTS)[number];

function isHandledEvent(event: string): event is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(event);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 401 }
    );
  }

  // Provjeri HMAC potpis
  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const payload: WebhookPayload = JSON.parse(rawBody);
  const eventName = payload.meta.event_name;

  if (!isHandledEvent(eventName)) {
    return NextResponse.json({ received: true, skipped: eventName });
  }

  const attrs = payload.data.attributes;
  const subscriptionId = payload.data.id;
  const customerId = String(attrs.customer_id);
  const variantId = String(attrs.variant_id);
  const userId = payload.meta.custom_data?.user_id;

  // Mapiranje LS statusa na naš interni status
  let status: string;
  switch (attrs.status) {
    case "active":
    case "trialing":
      status = "active";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "cancelled":
    case "expired":
      status = "cancelled";
      break;
    case "paused":
      status = "paused";
      break;
    case "unpaid":
      status = "unpaid";
      break;
    default:
      status = "inactive";
  }

  // Datum obnove / isteka
  const currentPeriodEnd = attrs.renews_at ?? attrs.ends_at ?? null;

  const supabase = getAdminClient();

  if (eventName === "subscription_created") {
    // Pronađi po user_id iz custom_data, ili napravi novi zapis
    if (!userId) {
      console.error("subscription_created: no user_id in custom_data");
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    // Upsert: možda korisnik već ima zapis sa statusom "inactive"
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
  }

  if (
    eventName === "subscription_updated" ||
    eventName === "subscription_cancelled"
  ) {
    // Ažuriraj po lemonsqueezy_subscription_id
    await supabase
      .from("subscriptions")
      .update({
        status,
        lemonsqueezy_variant_id: variantId,
        current_period_end: currentPeriodEnd,
      })
      .eq("lemonsqueezy_subscription_id", subscriptionId);
  }

  return NextResponse.json({ received: true, event: eventName });
}
