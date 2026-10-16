import type { NextConfig } from 'next';
import migration from './notion-migration.json';

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    if (process.env.WIKI_NOTION_ENABLED === 'false') return [];
    return [
      ...migration.redirects,
      { source: '/concepts/:slug', destination: migration.publicRoot, permanent: false },
      { source: '/reads/:slug', destination: migration.publicRoot, permanent: false },
    ];
  },
};

export default nextConfig;
