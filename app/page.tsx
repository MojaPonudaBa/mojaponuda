import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";

interface HomePageProps {
  searchParams?: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;
  const errorCode = resolvedSearchParams?.error_code;
  const errorDescription = resolvedSearchParams?.error_description;

  if (error || errorCode || errorDescription) {
    const params = new URLSearchParams();

    if (error) params.set("error", error);
    if (errorCode) params.set("error_code", errorCode);
    if (errorDescription) params.set("error_description", errorDescription);

    redirect(`/login?${params.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <LandingPage
      isLoggedIn={!!user}
    />
  );
}
