import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_ADMIN_EMAILS = ["marin.kolenda@outlook.com"];

export function getAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? getAdminEmails().includes(normalizedEmail) : false;
}

export async function requireAdminUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return user;
}
