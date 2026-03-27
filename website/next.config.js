/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use default (server/edge) output so API routes work on Vercel
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
