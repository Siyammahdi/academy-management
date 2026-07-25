import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Recorded-class thumbnails (lazy-loaded YouTube embeds).
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default nextConfig;
