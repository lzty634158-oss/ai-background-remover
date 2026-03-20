/** @type { import('next').NextConfig } */
const nextConfig = {
  // Image domains
  images: {
    domains: ['api.remove.bg'],
  },

  // Unique build ID each time - prevents webpack cache bloat on Cloudflare Pages
  generateBuildId: () => `build-${Date.now()}`,

  // Disable webpack persistent cache to avoid large .pack files in .next/cache/
  webpack: (config, { isServer }) => {
    config.cache = false;
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
