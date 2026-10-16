import { loadPublicLibrary } from '../../../lib/notion';
export const dynamic = 'force-dynamic';
export async function GET() {
  const library = await loadPublicLibrary();
  return Response.json(
    {
      available: library.available,
      source: library.source,
      syncedAt: library.syncedAt,
      concepts: library.concepts.length,
      readings: library.readings.length,
    },
    { status: library.available ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
