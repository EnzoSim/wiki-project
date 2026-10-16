import type { Concept, LibrarySourceType, ReadingEntry } from './wiki';
import type { Artwork, ContentNode, RichSegment } from './content-types';
import { NotionAPI } from 'notion-client';

export type PublicRecordMap = {
  block: Record<string, unknown>;
  collection?: Record<string, unknown>;
  collection_query?: Record<string, Record<string, unknown>>;
  signed_urls?: Record<string, string>;
};

type RawBlock = {
  id: string;
  type: string;
  alive?: boolean;
  parent_id?: string;
  properties?: Record<string, unknown>;
  content?: string[];
  last_edited_time?: number;
};

type Collection = { schema?: Record<string, { name: string; type: string }> };
export type PublicLibraryConfig = { rootId: string; termsId: string; readsId: string };
export type PublicLibrary = {
  available: boolean;
  source: 'notion-public' | 'snapshot';
  syncedAt: string;
  title: string;
  intro: string;
  credit: string;
  concepts: Concept[];
  readings: ReadingEntry[];
};

export function unwrap<T>(input: unknown): T | undefined {
  let current = input;
  for (let depth = 0; depth < 5; depth++) {
    if (!current || typeof current !== 'object') return undefined;
    if ('value' in current) current = (current as { value: unknown }).value;
    else return current as T;
  }
  return undefined;
}

export async function fetchPublicRecordMap(rootId: string): Promise<PublicRecordMap> {
  const notion = new NotionAPI({
    userTimeZone: 'America/Toronto',
    ofetchOptions: { timeout: 8000, retry: 0, signal: AbortSignal.timeout(12000) },
  });
  const map = await notion.getPage(rootId, {
    fetchRelationPages: false,
    signFileUrls: false,
    throwOnCollectionErrors: true,
    collectionReducerLimit: 1000,
  });
  // Collection rows are added after the client's initial descendant pass.
  // Load nested blocks (including collapsed provenance toggles) anonymously too.
  const attempted = new Set<string>();
  for (let round = 0; round < 8; round++) {
    const missing = [
      ...new Set(
        Object.values(map.block).flatMap((record) => unwrap<RawBlock>(record)?.content ?? []),
      ),
    ].filter((id) => !map.block[id] && !attempted.has(id));
    if (!missing.length) break;
    if (missing.length > 2000) throw new Error('NOTION_CONTENT_LIMIT');
    missing.forEach((id) => attempted.add(id));
    const additional = await notion.getBlocks(missing);
    Object.assign(map.block, additional.recordMap?.block ?? {});
  }
  await notion.addSignedUrls({ recordMap: map });
  return map as PublicRecordMap;
}

export function plain(input: unknown): string {
  if (!Array.isArray(input)) return '';
  return input
    .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
    .join('');
}

function slugify(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function safeHref(href: unknown): string | undefined {
  if (typeof href !== 'string') return undefined;
  if (href.startsWith('/') && !href.startsWith('//') && !href.includes('\\')) return href;
  try {
    const url = new URL(href);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function annotations(input: unknown): unknown[][] {
  return Array.isArray(input) ? input.filter((item): item is unknown[] => Array.isArray(item)) : [];
}

function firstFile(input: unknown): string | undefined {
  if (!Array.isArray(input)) return undefined;
  for (const part of input) {
    if (!Array.isArray(part)) continue;
    const link = annotations(part[1]).find((mark) => mark[0] === 'a');
    if (typeof link?.[1] === 'string') return link[1];
  }
  return undefined;
}

export function parsePublicLibrary(
  map: PublicRecordMap,
  config: PublicLibraryConfig,
  assets: Record<string, Artwork> = {},
): PublicLibrary {
  const root = unwrap<RawBlock>(map.block?.[config.rootId]);
  if (!root || root.alive === false) throw new Error('NOTION_NOT_PUBLIC');
  const terms = unwrap<Collection>(map.collection?.[config.termsId]);
  const reads = unwrap<Collection>(map.collection?.[config.readsId]);
  if (!terms?.schema || !reads?.schema) throw new Error('NOTION_SCHEMA_UNAVAILABLE');
  for (const collectionId of [config.termsId, config.readsId]) {
    for (const query of Object.values(map.collection_query?.[collectionId] ?? {})) {
      if (JSON.stringify(query).includes('"hasMore":true'))
        throw new Error('NOTION_INCOMPLETE_COLLECTION');
    }
  }
  const blocks = Object.values(map.block)
    .map((block) => unwrap<RawBlock>(block))
    .filter((block): block is RawBlock => Boolean(block?.id && block.alive !== false));
  const entries = blocks.filter(
    (block) =>
      block.type === 'page' && [config.termsId, config.readsId].includes(block.parent_id ?? ''),
  );
  const property = (page: RawBlock, name: string) => {
    const schema = page.parent_id === config.termsId ? terms.schema : reads.schema;
    const key = Object.keys(schema ?? {}).find((id) => schema?.[id].name === name);
    return key ? page.properties?.[key] : undefined;
  };
  const text = (page: RawBlock, name: string) => plain(property(page, name)).trim();
  const routes = new Map(
    entries.map((page) => [
      page.id,
      `/${page.parent_id === config.termsId ? 'concepts' : 'reads'}/${slugify(text(page, 'Slug') || plain(page.properties?.title))}`,
    ]),
  );
  routes.set(config.rootId, '/');
  const localLink = (href: unknown) => {
    const safe = safeHref(href);
    if (!safe) return undefined;
    const url = new URL(safe, 'https://app.notion.com');
    if (
      ['app.notion.com', 'www.notion.so', 'notion.so'].includes(url.hostname) ||
      url.hostname.endsWith('.notion.site')
    ) {
      const compact = url.pathname.match(/([a-f0-9]{32})/i)?.[1];
      if (compact) {
        const id = compact.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        return routes.get(id) ?? safe;
      }
    }
    return safe;
  };
  const rich = (input: unknown): RichSegment[] => {
    if (!Array.isArray(input)) return [];
    return input.flatMap((part) => {
      if (!Array.isArray(part) || typeof part[0] !== 'string') return [];
      const marks = annotations(part[1]);
      const mention = marks.find((mark) => mark[0] === 'p')?.[1];
      const mentionedPage =
        typeof mention === 'string' ? unwrap<RawBlock>(map.block[mention]) : undefined;
      const mentionRoute = typeof mention === 'string' ? routes.get(mention) : undefined;
      const label =
        part[0] === '‣' && mentionedPage
          ? plain(mentionedPage.properties?.title) || 'Linked page'
          : part[0];
      return [
        {
          text: label,
          bold: marks.some((mark) => mark[0] === 'b'),
          italic: marks.some((mark) => mark[0] === 'i'),
          code: marks.some((mark) => mark[0] === 'c'),
          strike: marks.some((mark) => mark[0] === 's'),
          href: mentionRoute || localLink(marks.find((mark) => mark[0] === 'a')?.[1]),
        },
      ];
    });
  };
  const media = (source: string | undefined, id: string): Artwork | undefined => {
    if (!source) return undefined;
    if (assets[source]) return assets[source];
    const url = safeHref(map.signed_urls?.[source] ?? map.signed_urls?.[id] ?? source);
    return url && /^(https?:\/\/|\/)/.test(url) ? { full: url } : undefined;
  };
  const content = (ids: string[], seen = new Set<string>(), depth = 0): ContentNode[] => {
    if (depth > 15) return [];
    return ids.flatMap((id) => {
      if (seen.has(id)) return [];
      const block = unwrap<RawBlock>(map.block[id]);
      if (!block || block.alive === false) return [];
      const visited = new Set(seen).add(id);
      return [
        {
          id,
          type: block.type,
          rich: rich(block.properties?.title),
          source: media(plain(block.properties?.source), id)?.full,
          caption: plain(block.properties?.caption),
          children: content(block.content ?? [], visited, depth + 1),
        },
      ];
    });
  };
  const list = (page: RawBlock, name: string) =>
    text(page, name)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  const sourceTypes = new Set([
    'article',
    'book',
    'essay',
    'note',
    'paper',
    'podcast',
    'term',
    'video',
    'webpage',
  ]);
  const concepts: Concept[] = [];
  const readings: ReadingEntry[] = [];
  for (const page of entries) {
    const body = content(page.content ?? []);
    const definition = body
      .find((block) => block.type === 'text')
      ?.rich.map((part) => part.text)
      .join('')
      .trim();
    const title = plain(page.properties?.title).trim();
    const slug = routes.get(page.id)?.split('/').pop() ?? '';
    const isTerm = page.parent_id === config.termsId;
    const summary = definition || text(page, isTerm ? 'Definition' : 'Summary');
    if (!title || !slug || !summary) continue;
    const section = (heading: string) => {
      const index = body.findIndex(
        (node) => node.rich.map((part) => part.text).join('') === heading,
      );
      return index >= 0
        ? body
            .slice(index + 1)
            .find((node) => node.type === 'text')
            ?.rich.map((part) => part.text)
            .join('')
        : undefined;
    };
    const sourceType = text(page, isTerm ? 'Source type' : 'Format');
    const common = {
      title,
      slug,
      notionId: page.id,
      summary,
      body,
      subthemes: list(page, 'Subthemes'),
      keywords: list(page, 'Keywords'),
      whyItMatters: section('Why it matters'),
      notes: section('Notes'),
      source: {
        type: (sourceTypes.has(sourceType)
          ? sourceType
          : isTerm
            ? 'term'
            : 'webpage') as LibrarySourceType,
        url: safeHref(text(page, 'Source URL')),
        label: text(page, 'Source label') || undefined,
      },
      addedVia: text(page, 'Added via') || undefined,
    };
    if (isTerm) {
      const related = Array.isArray(property(page, 'Related'))
        ? (property(page, 'Related') as unknown[]).flatMap((part) => {
            if (!Array.isArray(part)) return [];
            return annotations(part[1])
              .filter((mark) => mark[0] === 'p')
              .flatMap((mark) => {
                const route = typeof mark[1] === 'string' ? routes.get(mark[1]) : undefined;
                return route?.startsWith('/concepts/') ? [route.slice('/concepts/'.length)] : [];
              });
          })
        : [];
      const imageSource = firstFile(property(page, 'Artwork'));
      const artwork = media(imageSource, page.id);
      concepts.push({
        ...common,
        type: 'term',
        category: text(page, 'Category') || 'Uncategorized',
        related,
        artwork,
      });
    } else {
      const status = text(page, 'Status');
      readings.push({
        ...common,
        type: 'read',
        theme: text(page, 'Theme') || 'Reading',
        status:
          status === 'Published'
            ? 'published'
            : status === 'Read'
              ? 'read'
              : status === 'Reading'
                ? 'reading'
                : 'to-read',
        pdfUrl: media(firstFile(property(page, 'Document')), page.id)?.full,
      });
    }
  }
  const rootText = (root.content ?? [])
    .map((id) => unwrap<RawBlock>(map.block[id]))
    .filter((block) => block?.type === 'text')
    .map((block) => plain(block?.properties?.title).trim())
    .filter(Boolean);
  return {
    available: true,
    source: 'notion-public',
    syncedAt: new Date().toISOString(),
    title: plain(root.properties?.title) || 'Commonplace',
    intro: rootText[0] || 'Ideas, connections, and things worth keeping.',
    credit: rootText[1] || 'Collected by Enzo Simier.',
    concepts: concepts.sort((a, b) => a.title.localeCompare(b.title)),
    readings,
  };
}
