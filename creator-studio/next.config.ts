import type { NextConfig } from "next";

// STATIC ENGINE (Achiva model) — koi Node server nahi.
// `next build` ab out/ me pure HTML+JS+CSS generate karta hai jo APK ke
// assets/studio/ me jaata hai aur WebViewAssetLoader se load hota hai.
// Saara data browser ke IndexedDB me rehta hai (src/lib/studio/idb.ts).
const nextConfig: NextConfig = {
  output: "export",
  // APK me files assets/studio/ me rehti hain — WebViewAssetLoader ka standard
  // /assets/ handler inko https://appassets.androidplatform.net/assets/studio/… se
  // serve karta hai, isliye saare asset URLs isi prefix ke saath build hote hain.
  basePath: "/assets/studio",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
