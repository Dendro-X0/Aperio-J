import type { NextConfig } from "next";

const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  transpilePackages: ["@aperio-j/core", "@aperio-j/db", "@aperio-j/discovery", "@aperio-j/matcher", "@aperio-j/probe"],
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3", "playwright", "playwright-core"],
  allowedDevOrigins: ["127.0.0.1"],
  typescript: {
    // Next 16.2 ships generated route validators that fail under TS 6 without bundled .d.ts; app sources are checked via `pnpm typecheck`.
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  ...(isTauriBuild ? { output: "standalone" as const } : {}),
};

export default nextConfig;
