import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  devIndicators: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.googleusercontent.com' }, { protocol: 'https', hostname: '**.gstatic.com' }, { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' }] },
  outputFileTracingIncludes: { "/api/trip-pack/*": ["./public/fonts/NotoSansSC-Regular.otf"], "/api/pdf": ["./public/travel/**/*", "./public/fonts/*"], "/api/download": ["./public/travel/**/*", "./public/fonts/*"] },
};
export default nextConfig;
