import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Configurable via ADMIN_EMAILS env var (comma-separated).
// Falls back to hardcoded email for safety if env is not set.
const FALLBACK_ADMIN_EMAILS = ["marin.kolenda@outlook.com"];

export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  if (!envEmails?.trim()) return FALLBACK_ADMIN_EMAILS;
  return envEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
