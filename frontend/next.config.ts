import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.233.52.28'],
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
