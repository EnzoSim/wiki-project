import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import migration from '../notion-migration.json';
import assets from '../content/notion-artwork.json';
import snapshot from '../content/notion-snapshot.json';
import { fetchPublicRecordMap, parsePublicLibrary, type PublicLibrary } from './notion-data';

export const publicLibraryConfig = {
  rootId: '3fb314f9-feab-81ab-a2ee-e315b6e44f26',
  termsId: migration.termsDataSourceId,
  readsId: migration.readsDataSourceId,
};

function notPublic(error: unknown) {
  const status =
    error && typeof error === 'object' ? (error as { statusCode?: number }).statusCode : undefined;
  return (
    [401, 403, 404].includes(status ?? 0) ||
    (error instanceof Error && /NOTION_NOT_PUBLIC|Notion page not found/i.test(error.message))
  );
}

const readPublishedLibrary = unstable_cache(
  async (): Promise<PublicLibrary> => {
    try {
      // Anonymous reads only: never borrow a user's Notion session or private token.
      const map = await fetchPublicRecordMap(publicLibraryConfig.rootId);
      return parsePublicLibrary(map, publicLibraryConfig, assets);
    } catch (error) {
      if (notPublic(error)) {
        return {
          ...(snapshot as PublicLibrary),
          available: false,
          concepts: [],
          readings: [],
          syncedAt: new Date().toISOString(),
        };
      }
      console.warn('Published library temporarily unavailable; serving the verified snapshot.');
      return { ...(snapshot as PublicLibrary), source: 'snapshot' };
    }
  },
  ['published-reference-index-v2'],
  { revalidate: 60 },
);

export const loadPublicLibrary = cache(readPublishedLibrary);
