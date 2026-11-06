import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone = sirf zaroori node_modules ke saath self-contained server
  // (AntiGem is zip ko extract karke device par `node server.js` chalata hai)
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  // images optimize sharp maangta hai — device ke node par nahi chalega, disable
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
