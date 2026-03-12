import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "openai",
  ],
};

export default nextConfig;
