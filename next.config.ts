import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "openai",
  ],
  turbopack: {},
};

export default nextConfig;
