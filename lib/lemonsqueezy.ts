const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

function getHeaders(): HeadersInit {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY is not set");
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };
}

// ---------- Checkout ----------

interface CreateCheckoutParams {
  storeId: string;
  variantId: string;
  userEmail: string;
  userId: string;
  redirectUrl?: string;
  customData?: Record<string, string>;
}

interface CheckoutResponse {
  data: {
    attributes: {
      url: string;
    };
  };
}

export async function createCheckout({
  storeId,
  variantId,
  userEmail,
  userId,
  redirectUrl,
  customData,
}: CreateCheckoutParams): Promise<string> {
  const resolvedCustomData = Object.fromEntries(
    Object.entries({
      user_id: userId,
      ...(customData ?? {}),
    }).filter(([, value]) => Boolean(value)),
  );

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: {
          embed: false,
          media: false,
          button_color: "#1e3a5f",
        },
        checkout_data: {
          email: userEmail,
          custom: resolvedCustomData,
        },
        product_options: {
          redirect_url: redirectUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
        },
      },
      relationships: {
        store: {
          data: { type: "stores", id: storeId },
        },
        variant: {
          data: { type: "variants", id: variantId },
        },
      },
    },
  };

  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy checkout error: ${res.status} ${text}`);
  }

  const json = (await res.json()) as CheckoutResponse;
  return json.data.attributes.url;
}

// ---------- Customer Portal ----------

interface CustomerResponse {
  data: {
    attributes: {
      urls: {
        customer_portal: string;
      };
    };
  };
}

export async function getCustomerPortalUrl(
  customerId: string
): Promise<string> {
  const res = await fetch(`${LS_API_BASE}/customers/${customerId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy customer error: ${res.status} ${text}`);
  }

  const json = (await res.json()) as CustomerResponse;
  return json.data.attributes.urls.customer_portal;
}

// ---------- Webhook Signature ----------

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is not set");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // SEC: Timing-safe comparison to prevent timing attacks
  if (computedHex.length !== signature.length) {
    return false;
  }

  const a = Buffer.from(computedHex, "utf-8");
  const b = Buffer.from(signature, "utf-8");

  // Use Node.js crypto.timingSafeEqual for constant-time comparison
  const { timingSafeEqual } = await import("crypto");
  return timingSafeEqual(a, b);
}
