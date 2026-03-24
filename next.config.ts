import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  turbopack: {
    root: '/Users/daffa.romeromekari.com/Codebase/personal/payslip',
  },
};

export default nextConfig;
