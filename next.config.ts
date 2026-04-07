import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "mammoth", "pdf-parse", "canvas", "@napi-rs/canvas"],
};

export default nextConfig;
