import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const termsDir = path.join(projectRoot, 'content', 'terms');
const outputPath = path.join(projectRoot, 'wiki_master.md');

function readTermEntries() {
  if (!existsSync(termsDir)) {
    return [];
  }

  return readdirSync(termsDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => JSON.parse(readFileSync(path.join(termsDir, fileName), 'utf8')))
    .map((entry) => ({
      category: String(entry.category ?? 'Uncategorized').trim(),
      title: String(entry.title ?? '').trim(),
      summary: String(entry.summary ?? '').trim(),
    }))
    .filter((entry) => entry.title && entry.summary);
}

function buildWikiMasterMarkdown(entries) {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc.has(entry.category)) {
      acc.set(entry.category, []);
    }
    acc.get(entry.category).push(entry);
    return acc;
  }, new Map());

  const lines = [
    '# Wiki Master',
    '',
    '> Generated from `content/terms/*.json`. Edit those files or use the ingestion workflow.',
    '',
  ];

  Array.from(grouped.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .forEach(([category, categoryEntries], categoryIndex) => {
      lines.push(`## ${category}`);
      categoryEntries
        .sort((left, right) => left.title.localeCompare(right.title))
        .forEach((entry) => {
          lines.push(`- ${entry.title}: ${entry.summary}`);
        });

      if (categoryIndex < grouped.size - 1) {
        lines.push('');
      }
    });

  lines.push('');
  return lines.join('\n');
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buildWikiMasterMarkdown(readTermEntries()), 'utf8');
