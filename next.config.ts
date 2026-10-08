import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'store.is.autonavi.com', pathname: '/showpic/**' }] },
  outputFileTracingIncludes: { "/api/pdf": ["./public/travel/**/*", "./public/fonts/*"], "/api/download": ["./public/travel/**/*", "./public/fonts/*"] },
};
export default nextConfig;
