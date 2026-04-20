"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveEjnCredentials } from "@/lib/ejn-credentials";

export async function saveEjnCredentialsAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    throw new Error("Unesite i korisničko ime i lozinku.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niste prijavljeni.");

  await saveEjnCredentials(user.id, username, password);
  revalidatePath("/dashboard/settings");
}

export async function removeEjnCredentialsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niste prijavljeni.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = createAdminClient();
  await admin.from("ejn_credentials").delete().eq("user_id", user.id);
  revalidatePath("/dashboard/settings");
}
