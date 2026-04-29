import { redirect } from "next/navigation";

import { UiKitDemoClient } from "@/app/(dashboard)/dashboard/_dev/ui-kit/ui-kit-demo-client";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only visual QA route for Phase B dashboard infrastructure.
 */
export default async function UiKitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return <UiKitDemoClient />;
}

