import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable streaming metadata to work around Next.js 16.2.7 prerender bug
  // with /_global-error route and workStore initialization
  htmlLimitedBots: /.*/,
};

export default nextConfig;
