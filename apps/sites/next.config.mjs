

const nextConfig = {
  transpilePackages: ["@grwfit/ui", "@grwfit/shared-types"],
  // ISR: revalidate on-demand from API
  experimental: {
    incrementalCacheHandlerPath: undefined,
  },
};

export default nextConfig;
