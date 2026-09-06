/** @type {import('next').NextConfig} */
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  // Only use static export when building for Capacitor (not during dev or regular prod)
  ...(isCapacitorBuild ? { output: 'export' } : {}),

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Optimize for mobile and remove debug logs, but keep errors for tracking
  compiler: {
    removeConsole: isProd ? { exclude: ['error'] } : false,
  },

  // Strict mode - disabled in dev for faster hot reloads (double-renders slow things down)
  reactStrictMode: false,

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  // Removed optimizePackageImports because scanning lucide-react on OneDrive takes minutes

  // Fix for OneDrive projects outside the git root (Next.js 16 Turbopack)
  turbopack: {
    root: __dirname,
  },

  // Fix package-lock.json warning when project is outside git root (OneDrive)
  outputFileTracingRoot: path.join(__dirname),

  // Headers for security (only applies when NOT in static export mode)
  ...(!isCapacitorBuild ? {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
          ],
        },
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ];
    },
  } : {}),

};

module.exports = nextConfig;
