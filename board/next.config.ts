import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GITHUB_OWNER: process.env.GITHUB_OWNER,
    NEXT_PUBLIC_GITHUB_REPO: process.env.GITHUB_REPO,
    NEXT_PUBLIC_POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
  },
};

export default nextConfig;
