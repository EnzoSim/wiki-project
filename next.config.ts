import type { NextConfig } from 'next';
import migration from './notion-migration.json';

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    if (process.env.WIKI_NOTION_MODE === 'redirect') {
      return [
        ...migration.redirects,
        { source: '/concepts/:slug', destination: migration.publicRoot, permanent: false },
        { source: '/reads/:slug', destination: migration.publicRoot, permanent: false },
      ];
    }
    return migration.localAliases;
  },
};
export default nextConfig;
