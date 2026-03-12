import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.node = {
        ...config.node,
        __dirname: true,
      };
    }
    return config;
  },
};

export default nextConfig;
