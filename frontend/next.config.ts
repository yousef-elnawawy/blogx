import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.233.52.28'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        // /@johndoe  →  internally served by /u/johndoe  (no URL change for user)
        source: "/@:username",
        destination: "/u/:username",
      },
    ];
  },
};

export default nextConfig;
