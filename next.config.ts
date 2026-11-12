import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Route handlers read precomputed SI outputs from data/cache at runtime;
  // make sure those files ship with the serverless functions.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/cache/**/*.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
