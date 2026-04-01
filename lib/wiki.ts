import {
  wikiMasterConcepts,
  type WikiMasterConceptSeed,
} from '../content/wiki_master_source';

export type Concept = WikiMasterConceptSeed & {
  keywords: string[];
  source: string;
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
  'over',
  'under',
  'into',
  'between',
  'rather',
  'than',
  'should',
  'would',
  'could',
  'against',
]);

const phraseHints = [
  'urban economics',
  'real estate',
  'property values',
  'quality of life',
  'neighborhood character',
  'housing supply',
  'local veto',
  'public risk',
  'risk tradeoff',
  'public policy',
  'indigenous rights',
  'colonial law',
  'sovereignty',
  'territorial fiction',
  'development pressure',
  'protected core',
  'safety policy',
  'public space',
  'infrastructure',
  'residents',
  'opposition',
];

let cachedConcepts: Concept[] | null = null;

function normalize(value: string) {
  return value.toLowerCase();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 3)
    .filter((token) => !stopWords.has(token));
}

function buildSearchText(concept: WikiMasterConceptSeed) {
  return [
    concept.title,
    concept.slug,
    concept.category,
    concept.summary,
    concept.definition,
    concept.whyItMatters,
    concept.debate,
    concept.visualMotifs.join(' '),
    concept.related.join(' '),
  ].join(' ');
}

function extractKeywords(concept: WikiMasterConceptSeed) {
  const normalized = normalize(buildSearchText(concept));
  const tokens = tokenize(normalized);
  const phrases = phraseHints.filter((phrase) => normalized.includes(phrase));
  const signals = [
    concept.slug,
    concept.category,
    ...concept.visualMotifs,
    ...concept.related,
  ].map((item) => item.toLowerCase());

  return Array.from(new Set([...phrases, ...signals, ...tokens])).slice(0, 16);
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

function buildSourceNote(concept: WikiMasterConceptSeed) {
  return `Structured archive note for ${concept.title}. Summary, definition, impact, and debate are stored as separate fields for rendering.`;
}

function normalizeConcept(seed: WikiMasterConceptSeed, knownSlugs: Set<string>): Concept {
  const related = Array.from(
    new Set(
      seed.related
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0)
        .filter((slug) => knownSlugs.has(slug))
        .filter((slug) => slug !== seed.slug),
    ),
  );

  return {
    ...seed,
    related,
    keywords: extractKeywords({ ...seed, related }),
    source: buildSourceNote(seed),
  };
}

export function loadWikiConcepts(): Concept[] {
  if (cachedConcepts) return cachedConcepts;

  const knownSlugs = new Set(wikiMasterConcepts.map((concept) => concept.slug));
  cachedConcepts = wikiMasterConcepts.map((concept) => normalizeConcept(concept, knownSlugs));
  return cachedConcepts;
}

export function groupConceptsByCategory(concepts: Concept[]) {
  return concepts.reduce<Record<string, Concept[]>>((acc, concept) => {
    if (!acc[concept.category]) acc[concept.category] = [];
    acc[concept.category].push(concept);
    return acc;
  }, {});
}

export function getConceptBySlug(slug: string) {
  return loadWikiConcepts().find((concept) => concept.slug === slug);
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
  const normalized = normalize(keyword.trim());
  if (!normalized) return [];

  return concepts.filter((concept) => {
    const text = [
      concept.title,
      concept.slug,
      concept.category,
      concept.summary,
      concept.definition,
      concept.whyItMatters,
      concept.debate,
      concept.visualMotifs.join(' '),
      concept.related.join(' '),
      concept.keywords.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return text.includes(normalized);
  });
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
