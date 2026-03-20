/** @type { import('next').NextConfig } */
const nextConfig = {
  // Cloudflare Pages configuration
  output: 'standalone',
  outputFileTracingRoot: __dirname,

  // Image domains
  images: {
    domains: ['api.remove.bg'],
  },

  // Remove Node.js polyfills since we're no longer using native modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },

  // Headers for CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
