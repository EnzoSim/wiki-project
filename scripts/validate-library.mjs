import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

function readDirectoryEntries(relativeDirectory) {
  const directoryPath = path.join(projectRoot, relativeDirectory);

  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => ({
      fileName,
      filePath: path.join(directoryPath, fileName),
      data: JSON.parse(readFileSync(path.join(directoryPath, fileName), 'utf8')),
    }));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateTerm(entry, fileName) {
  assert(entry.type === 'term', `${fileName} must have type "term".`);
  assert(typeof entry.title === 'string' && entry.title.trim(), `${fileName} is missing a title.`);
  assert(typeof entry.slug === 'string' && entry.slug.trim(), `${fileName} is missing a slug.`);
  assert(typeof entry.category === 'string' && entry.category.trim(), `${fileName} is missing a category.`);
  assert(typeof entry.summary === 'string' && entry.summary.trim(), `${fileName} is missing a summary.`);
  assert(
    Array.isArray(entry.subthemes) && entry.subthemes.every((value) => typeof value === 'string'),
    `${fileName} must have a string array of subthemes.`,
  );
  assert(
    Array.isArray(entry.keywords) && entry.keywords.every((value) => typeof value === 'string'),
    `${fileName} must have a string array of keywords.`,
  );
}

function validateRead(entry, fileName) {
  assert(entry.type === 'read', `${fileName} must have type "read".`);
  assert(typeof entry.title === 'string' && entry.title.trim(), `${fileName} is missing a title.`);
  assert(typeof entry.slug === 'string' && entry.slug.trim(), `${fileName} is missing a slug.`);
  assert(typeof entry.theme === 'string' && entry.theme.trim(), `${fileName} is missing a theme.`);
  assert(typeof entry.summary === 'string' && entry.summary.trim(), `${fileName} is missing a summary.`);
  assert(
    Array.isArray(entry.subthemes) && entry.subthemes.every((value) => typeof value === 'string'),
    `${fileName} must have a string array of subthemes.`,
  );
  assert(
    Array.isArray(entry.keywords) && entry.keywords.every((value) => typeof value === 'string'),
    `${fileName} must have a string array of keywords.`,
  );
  assert(
    entry.status === 'to-read' || entry.status === 'published',
    `${fileName} must have status "to-read" or "published".`,
  );
}

const terms = readDirectoryEntries('content/terms');
const reads = readDirectoryEntries('content/reads');

const termSlugs = new Set();
const readSlugs = new Set();

terms.forEach(({ data, fileName }) => {
  validateTerm(data, fileName);
  assert(path.basename(fileName, '.json') === data.slug, `${fileName} slug must match the file name.`);
  assert(!termSlugs.has(data.slug), `Duplicate term slug detected: ${data.slug}`);
  termSlugs.add(data.slug);
});

reads.forEach(({ data, fileName }) => {
  validateRead(data, fileName);
  assert(path.basename(fileName, '.json') === data.slug, `${fileName} slug must match the file name.`);
  assert(!readSlugs.has(data.slug), `Duplicate read slug detected: ${data.slug}`);
  readSlugs.add(data.slug);
});

console.log(`Validated ${terms.length} term entries and ${reads.length} reading entries.`);
