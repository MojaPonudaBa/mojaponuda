import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckout } from "@/lib/lemonsqueezy";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

  if (!storeId || !variantId) {
    return NextResponse.json(
      { error: "Lemon Squeezy konfiguracija nedostaje." },
      { status: 500 }
    );
  }

  try {
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
