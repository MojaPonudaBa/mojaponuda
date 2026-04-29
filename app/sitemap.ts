import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://tendersistem.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("slug, updated_at")
    .eq("published", true)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(500);

  const opportunityUrls: MetadataRoute.Sitemap = (opportunities ?? []).map((o) => ({
    url: `${BASE_URL}/prilike/${o.slug.split("/").pop()}`,
    lastModified: o.updated_at ? new Date(o.updated_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/prilike`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/zakon`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...opportunityUrls,
  ];
}

