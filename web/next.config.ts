import type { NextConfig } from 'next'



/**
 * Same-origin API proxy. The browser calls `/api/v1/...` on the Next host;
 * Next forwards to Nest. That removes CORS for phone-on-LAN and Vercel→API
 * setups, and stops mobile from resolving `localhost` as the phone itself.
 *
 * Set API_PROXY_TARGET to the Nest origin (no `/api/v1` suffix), e.g.
 * `http://127.0.0.1:4000` locally or `https://your-api.example.com` on Vercel.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET?.replace(/\/$/, '')

console.log('NEXT CONFIG LOADED');
console.log('API_PROXY_TARGET =', API_PROXY_TARGET);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  async rewrites() {
    if (!API_PROXY_TARGET) return []
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
