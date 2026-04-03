import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export type LibrarySourceType =
  | 'article'
  | 'book'
  | 'essay'
  | 'note'
  | 'paper'
  | 'podcast'
  | 'term'
  | 'video'
  | 'webpage';

export type LibrarySource = {
  type: LibrarySourceType;
  url?: string;
  label?: string;
};

export type Concept = {
  type: 'term';
  title: string;
  slug: string;
  category: string;
  subthemes: string[];
  summary: string;
  whyItMatters?: string;
  notes?: string;
  keywords: string[];
  related: string[];
  source?: LibrarySource;
  addedVia?: string;
  submittedAt?: string;
};

export type ReadingEntry = {
  type: 'read';
  title: string;
  slug: string;
  theme: string;
  subthemes: string[];
  summary: string;
  whyItMatters?: string;
  notes?: string;
  keywords: string[];
  status: 'to-read' | 'published';
  source?: LibrarySource;
  addedVia?: string;
  submittedAt?: string;
};

export type KeywordFrequency = {
  keyword: string;
  count: number;
};

export type CategoryOverview = {
  category: string;
  count: number;
  concepts: Concept[];
  topKeywords: KeywordFrequency[];
  featuredConcepts: Concept[];
};

export type WikiOverview = {
  totalConcepts: number;
  totalCategories: number;
  totalKeywords: number;
  topKeywords: KeywordFrequency[];
  categories: CategoryOverview[];
  featuredCategories: CategoryOverview[];
  featuredConcepts: Concept[];
};

export type ReadingSubthemeOverview = {
  subtheme: string;
  count: number;
};

export type ReadingThemeOverview = {
  theme: string;
  count: number;
  subthemes: ReadingSubthemeOverview[];
  items: ReadingEntry[];
};

const stopWords = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'their',
  'even',
  'they',
  'are',
  'its',
  'your',
  'about',
  'when',
  'often',
  'also',
  'such',
  'than',
  'more',
  'most',
  'through',
  'across',
  'being',
  'where',
  'which',
  'once',
  'used',
]);

const phraseHints = [
  'urban economics',
  'real estate',
  'property values',
  'quality of life',
  'neighborhood character',
  'infrastructure',
  'development',
  'housing',
  'zoning',
  'opposition',
  'homeowners',
  'residents',
  'fiscal federalism',
  'capital budgeting',
  'inflation targeting',
  'output gap',
  'labor force participation',
  'human capital',
  'industrial policy',
  'supply chain resilience',
  'loss aversion',
  'social norms',
  'colonial law',
  'risk management',
  'political culture',
  'intellectual history',
];

let cachedConcepts: Concept[] | null = null;
let cachedReadings: ReadingEntry[] | null = null;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractKeywords(text: string) {
  const normalized = text.toLowerCase();
  const tokens = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 3)
    .filter((token) => !stopWords.has(token));
  const phrases = phraseHints.filter((phrase) => normalized.includes(phrase));
  return Array.from(new Set([...phrases, ...tokens])).slice(0, 10);
}

function escapeSvgText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function compareKeywordFrequency(a: KeywordFrequency, b: KeywordFrequency) {
  return b.count - a.count || a.keyword.localeCompare(b.keyword);
}

function buildKeywordFrequency(concepts: Concept[]) {
  const counts = new Map<string, number>();
  for (const concept of concepts) {
    for (const keyword of concept.keywords) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort(compareKeywordFrequency);
}

function scoreConcept(concept: Concept) {
  return concept.related.length * 3 + concept.keywords.length;
}

function dedupeCategories(concepts: Concept[]) {
  return Array.from(new Set(concepts.map((concept) => concept.category)));
}

function resolveContentRoot() {
  const candidates = [
    path.join(process.cwd(), 'content'),
    path.join(process.cwd(), '.next', 'standalone', 'content'),
  ];
  const contentRoot = candidates.find((candidate) => existsSync(candidate));

  if (!contentRoot) {
    throw new Error('Expected a content directory at the project root or in the standalone bundle.');
  }

  return contentRoot;
}

function readJsonCollection<T>(directoryName: string): T[] {
  const directoryPath = path.join(resolveContentRoot(), directoryName);

  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      return JSON.parse(readFileSync(filePath, 'utf8')) as T;
    });
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function normalizeSource(value: unknown): LibrarySource | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const source = value as { type?: unknown; url?: unknown; label?: unknown };
  if (typeof source.type !== 'string') return undefined;

  return {
    type: source.type as LibrarySourceType,
    url: typeof source.url === 'string' && source.url.trim() ? source.url.trim() : undefined,
    label: typeof source.label === 'string' && source.label.trim() ? source.label.trim() : undefined,
  };
}

function parseConcept(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid concept entry.');
  }

  const entry = value as Record<string, unknown>;
  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  const category = typeof entry.category === 'string' ? entry.category.trim() : '';
  const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';
  const slug = typeof entry.slug === 'string' && entry.slug.trim() ? entry.slug.trim() : slugify(title);

  if (!title || !category || !summary) {
    throw new Error(`Concept entry is missing required fields: ${JSON.stringify(entry)}`);
  }

  const subthemes = normalizeStringArray(entry.subthemes);
  const keywords = normalizeStringArray(entry.keywords);

  return {
    type: 'term' as const,
    title,
    slug,
    category,
    subthemes,
    summary,
    whyItMatters: typeof entry.whyItMatters === 'string' ? entry.whyItMatters.trim() : undefined,
    notes: typeof entry.notes === 'string' ? entry.notes.trim() : undefined,
    keywords: keywords.length > 0 ? keywords : extractKeywords(`${category} ${subthemes.join(' ')} ${summary}`),
    related: [],
    source: normalizeSource(entry.source),
    addedVia: typeof entry.addedVia === 'string' ? entry.addedVia.trim() : undefined,
    submittedAt: typeof entry.submittedAt === 'string' ? entry.submittedAt.trim() : undefined,
  };
}

function parseReading(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid reading entry.');
  }

  const entry = value as Record<string, unknown>;
  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  const theme = typeof entry.theme === 'string' ? entry.theme.trim() : '';
  const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';
  const slug = typeof entry.slug === 'string' && entry.slug.trim() ? entry.slug.trim() : slugify(title);
  const status: ReadingEntry['status'] = entry.status === 'published' ? 'published' : 'to-read';

  if (!title || !theme || !summary) {
    throw new Error(`Reading entry is missing required fields: ${JSON.stringify(entry)}`);
  }

  const subthemes = normalizeStringArray(entry.subthemes);
  const keywords = normalizeStringArray(entry.keywords);

  return {
    type: 'read' as const,
    title,
    slug,
    theme,
    subthemes,
    summary,
    whyItMatters: typeof entry.whyItMatters === 'string' ? entry.whyItMatters.trim() : undefined,
    notes: typeof entry.notes === 'string' ? entry.notes.trim() : undefined,
    keywords: keywords.length > 0 ? keywords : extractKeywords(`${theme} ${subthemes.join(' ')} ${summary}`),
    status,
    source: normalizeSource(entry.source),
    addedVia: typeof entry.addedVia === 'string' ? entry.addedVia.trim() : undefined,
    submittedAt: typeof entry.submittedAt === 'string' ? entry.submittedAt.trim() : undefined,
  };
}

function buildRelatedConcepts(concepts: Concept[]) {
  const allKeywords = concepts.map((concept) => new Set(concept.keywords));

  concepts.forEach((concept, index) => {
    concept.related = concepts
      .map((other, otherIndex) => {
        if (index === otherIndex) return null;
        const overlap = other.keywords.filter((keyword) => allKeywords[index].has(keyword)).length;
        return { slug: other.slug, overlap };
      })
      .filter((entry): entry is { slug: string; overlap: number } => Boolean(entry))
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || a.slug.localeCompare(b.slug))
      .map((entry) => entry.slug);
  });

  return concepts;
}

function buildCategoryOverview(category: string, concepts: Concept[]): CategoryOverview {
  const categoryConcepts = concepts.filter((concept) => concept.category === category);
  const keywordCounts = buildKeywordFrequency(categoryConcepts);
  return {
    category,
    count: categoryConcepts.length,
    concepts: categoryConcepts,
    topKeywords: keywordCounts.slice(0, 5),
    featuredConcepts: [...categoryConcepts]
      .sort((a, b) => scoreConcept(b) - scoreConcept(a) || a.title.localeCompare(b.title))
      .slice(0, 2),
  };
}

function sortByFeatureScore(concepts: Concept[]) {
  return [...concepts].sort((a, b) => scoreConcept(b) - scoreConcept(a) || a.title.localeCompare(b.title));
}

function sortReadings(readings: ReadingEntry[]) {
  return [...readings].sort((left, right) => {
    const leftDate = left.submittedAt ? Date.parse(left.submittedAt) : 0;
    const rightDate = right.submittedAt ? Date.parse(right.submittedAt) : 0;
    return rightDate - leftDate || left.title.localeCompare(right.title);
  });
}

export function loadWikiConcepts(): Concept[] {
  if (cachedConcepts) return cachedConcepts;

  const concepts = readJsonCollection<Record<string, unknown>>('terms').map(parseConcept);
  cachedConcepts = buildRelatedConcepts(concepts);
  return cachedConcepts;
}

export function loadReadingQueue(status: ReadingEntry['status'] | 'all' = 'to-read') {
  if (!cachedReadings) {
    cachedReadings = readJsonCollection<Record<string, unknown>>('reads').map(parseReading);
  }

  if (status === 'all') {
    return sortReadings(cachedReadings);
  }

  return sortReadings(cachedReadings.filter((entry) => entry.status === status));
}

export function groupConceptsByCategory(concepts: Concept[]) {
  return concepts.reduce<Record<string, Concept[]>>((acc, concept) => {
    if (!acc[concept.category]) acc[concept.category] = [];
    acc[concept.category].push(concept);
    return acc;
  }, {});
}

export function groupReadingsByTheme(readings: ReadingEntry[] = loadReadingQueue()) {
  const themes = new Map<string, ReadingEntry[]>();

  readings.forEach((entry) => {
    const current = themes.get(entry.theme) ?? [];
    current.push(entry);
    themes.set(entry.theme, current);
  });

  return Array.from(themes.entries())
    .map(([theme, items]) => {
      const subthemeCounts = new Map<string, number>();

      items.forEach((item) => {
        item.subthemes.forEach((subtheme) => {
          subthemeCounts.set(subtheme, (subthemeCounts.get(subtheme) ?? 0) + 1);
        });
      });

      return {
        theme,
        count: items.length,
        items: sortReadings(items),
        subthemes: Array.from(subthemeCounts.entries())
          .map(([subtheme, count]) => ({ subtheme, count }))
          .sort((left, right) => right.count - left.count || left.subtheme.localeCompare(right.subtheme)),
      };
    })
    .sort((left, right) => right.count - left.count || left.theme.localeCompare(right.theme));
}

export function getConceptBySlug(slug: string) {
  return loadWikiConcepts().find((concept) => concept.slug === slug);
}

export function getReadingBySlug(slug: string) {
  return loadReadingQueue('all').find((entry) => entry.slug === slug);
}

export function getConceptCountByCategory(concepts: Concept[] = loadWikiConcepts()) {
  return concepts.reduce<Record<string, number>>((acc, concept) => {
    acc[concept.category] = (acc[concept.category] ?? 0) + 1;
    return acc;
  }, {});
}

export function getTrendingKeywords(concepts: Concept[] = loadWikiConcepts(), limit = 8) {
  return buildKeywordFrequency(concepts).slice(0, limit);
}

export function getFeaturedConcepts(concepts: Concept[] = loadWikiConcepts(), limit = 4) {
  return sortByFeatureScore(concepts).slice(0, limit);
}

export function getFeaturedCategories(concepts: Concept[] = loadWikiConcepts(), limit = 3) {
  return dedupeCategories(concepts)
    .map((category) => buildCategoryOverview(category, concepts))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
    .slice(0, limit);
}

export function getConceptsByKeyword(keyword: string, concepts: Concept[] = loadWikiConcepts()) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];

  return concepts.filter((concept) =>
    concept.keywords.some((entry) => entry.toLowerCase() === normalized || entry.toLowerCase().includes(normalized)),
  );
}

export function getWikiOverview(concepts: Concept[] = loadWikiConcepts()): WikiOverview {
  const categories = dedupeCategories(concepts)
    .map((category) => buildCategoryOverview(category, concepts))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  const topKeywords = buildKeywordFrequency(concepts);

  return {
    totalConcepts: concepts.length,
    totalCategories: categories.length,
    totalKeywords: topKeywords.length,
    topKeywords: topKeywords.slice(0, 10),
    categories,
    featuredCategories: categories.slice(0, 3),
    featuredConcepts: getFeaturedConcepts(concepts, 4),
  };
}

export function buildConceptPrompt(concept: Concept) {
  return `Create a clean editorial illustration for the concept "${concept.title}". Visual cues: ${concept.keywords.join(', ')}. Style: modern, minimal, high-contrast, informative, wiki-like. No text in the image.`;
}

export function buildConceptImageSvg(concept: Concept) {
  const palette = ['#0f172a', '#1d4ed8', '#06b6d4', '#22c55e', '#f97316'];
  const colors = concept.keywords.slice(0, 3).map((_, index) => palette[index % palette.length]);
  const safeTitle = escapeSvgText(concept.title);
  const safeSummary = escapeSvgText(concept.summary);
  const accent = colors[1] ?? '#1d4ed8';
  const fill = colors[2] ?? '#06b6d4';
  const bg = colors[0] ?? '#0f172a';
  const svg = `<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${accent}"/></linearGradient></defs><rect width="1200" height="800" rx="48" fill="url(#bg)"/><circle cx="920" cy="170" r="130" fill="${fill}" opacity="0.2"/><rect x="140" y="150" width="920" height="500" rx="36" fill="#ffffff" opacity="0.12"/><rect x="190" y="210" width="340" height="250" rx="24" fill="#ffffff" opacity="0.92"/><rect x="580" y="210" width="430" height="110" rx="24" fill="#ffffff" opacity="0.12"/><rect x="580" y="350" width="430" height="110" rx="24" fill="#ffffff" opacity="0.12"/><rect x="190" y="500" width="820" height="90" rx="24" fill="#ffffff" opacity="0.16"/><text x="220" y="110" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${safeTitle}</text><text x="220" y="620" font-family="Inter, Arial, sans-serif" font-size="28" fill="#e2e8f0">${safeSummary.slice(0, 120)}</text><text x="610" y="278" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#ffffff">Structured concept entry</text><text x="610" y="320" font-family="Inter, Arial, sans-serif" font-size="22" fill="#e2e8f0">Derived from the repo library metadata</text><text x="610" y="418" font-family="Inter, Arial, sans-serif" font-size="22" fill="#e2e8f0">Keywords: ${escapeSvgText(concept.keywords.slice(0, 4).join(' · '))}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
