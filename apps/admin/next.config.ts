import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@grwfit/ui", "@grwfit/shared-types"],
};

export default nextConfig;
