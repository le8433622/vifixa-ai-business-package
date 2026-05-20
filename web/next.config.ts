import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

const enableSentryBuildUploads =
  process.env.SENTRY_ENABLE_BUILD_UPLOADS === "true" &&
  Boolean(
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT &&
    process.env.SENTRY_AUTH_TOKEN
  );

export default enableSentryBuildUploads
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
