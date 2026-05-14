import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@grwfit/ui", "@grwfit/shared-types"],
  images: {
    domains: ["localhost", "supabase.co", "s3.ap-south-1.amazonaws.com"],
  },
  experimental: {
    typedRoutes: false,
  },
};

export default withNextIntl(nextConfig);
