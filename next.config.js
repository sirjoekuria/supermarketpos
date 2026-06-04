/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  // Only use static export when building for Capacitor (not during dev or regular prod)
  ...(isCapacitorBuild ? { output: 'export' } : {}),

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Optimize for mobile
  compiler: {
    removeConsole: isProd,
  },

  // Strict mode for development
  reactStrictMode: true,

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
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ];
    },
  } : {}),

};

module.exports = nextConfig;
