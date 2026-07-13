import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-telegram-bot-api", "pg"],
  output: "standalone",
};

export default nextConfig;
