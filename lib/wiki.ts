import { wikiMasterMarkdown } from '../content/wiki_master_source';

export type Concept = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  keywords: string[];
  related: string[];
  source: string;
};

const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'their', 'even', 'they', 'are', 'its', 'your', 'about']);

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function extractKeywords(text: string) {
  const normalized = text.toLowerCase();
  const tokens = normalized.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).map((token) => token.trim()).filter(Boolean).filter((token) => token.length > 3).filter((token) => !stopWords.has(token));
  const phraseHints = ['urban economics', 'real estate', 'property values', 'quality of life', 'neighborhood character', 'infrastructure', 'development', 'housing', 'zoning', 'opposition', 'homeowners', 'residents'].filter((phrase) => normalized.includes(phrase));
  return Array.from(new Set([...phraseHints, ...tokens])).slice(0, 10);
}

export function loadWikiConcepts(): Concept[] {
  const lines = wikiMasterMarkdown.split(/\r?\n/);
  let currentCategory = 'Uncategorized';
  const concepts: Concept[] = [];

  for (const line of lines) {
    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) { currentCategory = categoryMatch[1].trim(); continue; }
    const itemMatch = line.match(/^[-*]\s+([^:]+):\s+(.+)$/);
    if (!itemMatch) continue;
    const title = itemMatch[1].trim();
    const summary = itemMatch[2].trim();
    const source = `${title}: ${summary}`;
    const keywords = extractKeywords(`${currentCategory} ${source}`);
    concepts.push({ title, slug: slugify(title), category: currentCategory, summary, keywords, related: [], source });
  }

  const allKeywords = concepts.map((concept) => new Set(concept.keywords));
  concepts.forEach((concept, index) => {
    concept.related = concepts.map((other, otherIndex) => {
      if (index === otherIndex) return null;
      const overlap = other.keywords.filter((keyword) => allKeywords[index].has(keyword)).length;
      return { slug: other.slug, overlap };
    }).filter((entry): entry is { slug: string; overlap: number } => Boolean(entry)).filter((entry) => entry.overlap > 0).sort((a, b) => b.overlap - a.overlap).map((entry) => entry.slug);
  });

  return concepts;
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

export function buildConceptPrompt(concept: Concept) {
  return `Create a clean editorial illustration for the economics concept "${concept.title}". Visual cues: ${concept.keywords.join(', ')}. Style: modern, minimal, high-contrast, informative, wiki-like. No text in the image.`;
}

export function buildConceptImageSvg(concept: Concept) {
  const palette = ['#0f172a', '#1d4ed8', '#06b6d4', '#22c55e', '#f97316'];
  const colors = concept.keywords.slice(0, 3).map((_, index) => palette[index % palette.length]);
  const safeTitle = concept.title.replace(/&/g, '&amp;');
  const safeSummary = concept.summary.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const accent = colors[1] ?? '#1d4ed8';
  const fill = colors[2] ?? '#06b6d4';
  const bg = colors[0] ?? '#0f172a';
  const svg = `<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${accent}"/></linearGradient></defs><rect width="1200" height="800" rx="48" fill="url(#bg)"/><circle cx="920" cy="170" r="130" fill="${fill}" opacity="0.2"/><rect x="140" y="150" width="920" height="500" rx="36" fill="#ffffff" opacity="0.12"/><rect x="190" y="210" width="340" height="250" rx="24" fill="#ffffff" opacity="0.92"/><rect x="580" y="210" width="430" height="110" rx="24" fill="#ffffff" opacity="0.12"/><rect x="580" y="350" width="430" height="110" rx="24" fill="#ffffff" opacity="0.12"/><rect x="190" y="500" width="820" height="90" rx="24" fill="#ffffff" opacity="0.16"/><text x="220" y="110" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${safeTitle}</text><text x="220" y="620" font-family="Inter, Arial, sans-serif" font-size="28" fill="#e2e8f0">${safeSummary.slice(0, 120)}</text><text x="610" y="278" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#ffffff">Auto-enriched concept</text><text x="610" y="320" font-family="Inter, Arial, sans-serif" font-size="22" fill="#e2e8f0">Generated from wiki_master.md metadata</text><text x="610" y="418" font-family="Inter, Arial, sans-serif" font-size="22" fill="#e2e8f0">Keywords: ${concept.keywords.slice(0, 4).join(' · ')}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
