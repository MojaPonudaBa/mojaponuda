import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import type { Subscription } from "@/types/database";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { data: subData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const subscription = subData as Subscription | null;

  if (!subscription?.lemonsqueezy_customer_id) {
    return NextResponse.json(
      { error: "Nemate aktivnu pretplatu." },
      { status: 404 }
    );
  }

  try {
    const portalUrl = await getCustomerPortalUrl(
      subscription.lemonsqueezy_customer_id
    );

    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    console.error("Customer portal error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Portal greška: ${message}` },
      { status: 500 }
    );
  }
}
