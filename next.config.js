/** @type {import('next').NextConfig} */

const nextConfig = {
  // Export as static HTML for Capacitor
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Optimize for mobile
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Strict mode for development
  reactStrictMode: true,

  // Headers for security
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
    ];
  },

  // Webpack configuration
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },

  // Environment variables available to browser
  publicRuntimeConfig: {
    isDev: process.env.NODE_ENV === 'development',
  },
};

module.exports = nextConfig;
