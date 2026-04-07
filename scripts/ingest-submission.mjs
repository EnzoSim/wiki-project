import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = process.cwd();
const termsDir = path.join(projectRoot, 'content', 'terms');
const readsDir = path.join(projectRoot, 'content', 'reads');
const resultPath = path.join(projectRoot, '.ingest-result.json');

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

function hasSupabaseWriteConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

function createSupabaseAdminClient() {
  if (!hasSupabaseWriteConfig()) {
    throw new Error('Supabase write config is missing.');
  }

  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function readEventPayload() {
  if (process.env.SUBMISSION_TEXT) {
    return {
      submissionText: process.env.SUBMISSION_TEXT,
      sourceUrl: process.env.SUBMISSION_SOURCE_URL ?? '',
      sourceType: process.env.SUBMISSION_SOURCE_TYPE ?? '',
      addedVia: process.env.SUBMISSION_ADDED_VIA ?? 'manual',
      autoMerge: process.env.SUBMISSION_AUTO_MERGE === 'true',
      submitter: process.env.SUBMISSION_SUBMITTER ?? '',
    };
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    throw new Error('No submission payload found. Provide SUBMISSION_TEXT or run inside a GitHub Action event.');
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const inputs = event.inputs ?? {};
  const payload = event.client_payload ?? {};

  return {
    submissionText: String(inputs.submission_text ?? payload.submission_text ?? '').trim(),
    sourceUrl: String(inputs.source_url ?? payload.source_url ?? '').trim(),
    sourceType: String(inputs.source_type ?? payload.source_type ?? '').trim(),
    addedVia: String(inputs.added_via ?? payload.added_via ?? event.action ?? event.event_type ?? 'github').trim(),
    autoMerge: String(inputs.auto_merge ?? payload.auto_merge ?? 'false') === 'true',
    submitter: String(inputs.submitter ?? payload.submitter ?? event.sender?.login ?? '').trim(),
  };
}

function ensureUniqueSlugInDirectory(directoryPath, candidateSlug) {
  const existingSlugs = new Set(
    readdirSync(directoryPath)
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => path.basename(fileName, '.json')),
  );

  if (!existingSlugs.has(candidateSlug)) {
    return candidateSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${candidateSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${candidateSlug}-${suffix}`;
}

async function ensureUniqueSlugInSupabase(client, tableName, candidateSlug) {
  let suffix = 1;

  while (true) {
    const slug = suffix === 1 ? candidateSlug : `${candidateSlug}-${suffix}`;
    const { data, error } = await client.from(tableName).select('slug').eq('slug', slug).maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return slug;
    }

    suffix += 1;
  }
}

function extractTitleFromSubmission(submissionText) {
  const lines = submissionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return 'Untitled submission';
  }

  const firstLine = lines[0];
  const colonMatch = firstLine.match(/^([^:]{2,80}):\s+(.+)$/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  return firstLine.replace(/^[-*]\s+/, '').slice(0, 80).trim();
}

function firstSentence(value) {
  const sentence = value
    .replace(/\s+/g, ' ')
    .match(/(.+?[.!?])(\s|$)/);
  return sentence?.[1]?.trim() ?? value.trim();
}

function heuristicClassification(payload) {
  const normalizedText = payload.submissionText.trim();
  const title = extractTitleFromSubmission(normalizedText);
  const slugHint = slugify(title);
  const looksLikeTerm =
    payload.sourceType === 'term' ||
    /^[^:]{2,80}:\s+.+$/.test(normalizedText) ||
    (!payload.sourceUrl && normalizedText.split(/\s+/).length < 40);

  if (looksLikeTerm) {
    const colonMatch = normalizedText.match(/^[^:]{2,80}:\s+(.+)$/);
    const summary = firstSentence(colonMatch?.[1] ?? normalizedText);

    return {
      entryType: 'term',
      title,
      slugHint,
      category: 'Uncategorized',
      theme: '',
      subthemes: ['Inbox'],
      summary,
      whyItMatters:
        'Submitted through the ingestion workflow. Review and refine the category and supporting notes before treating it as a settled entry.',
      notes: normalizedText,
      keywords: [],
      status: 'published',
      sourceType: payload.sourceType || 'term',
      sourceUrl: payload.sourceUrl,
    };
  }

  return {
    entryType: 'read',
    title,
    slugHint,
    category: '',
    theme: 'Unsorted',
    subthemes: ['Inbox'],
    summary: firstSentence(normalizedText),
    whyItMatters:
      'Queued from the submission inbox. This item should be reviewed, enriched, and either promoted into a published concept or kept as a themed reading lead.',
    notes: normalizedText,
    keywords: [],
    status: 'to-read',
    sourceType: payload.sourceType || 'webpage',
    sourceUrl: payload.sourceUrl,
  };
}

async function classifyWithAI(payload) {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicClassification(payload);
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      entryType: { type: 'string', enum: ['term', 'read'] },
      title: { type: 'string' },
      slugHint: { type: 'string' },
      category: { type: 'string' },
      theme: { type: 'string' },
      subthemes: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 5,
      },
      summary: { type: 'string' },
      whyItMatters: { type: 'string' },
      notes: { type: 'string' },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 10,
      },
      status: { type: 'string', enum: ['published', 'to-read'] },
      sourceType: {
        type: 'string',
        enum: ['article', 'book', 'essay', 'note', 'paper', 'podcast', 'term', 'video', 'webpage'],
      },
      sourceUrl: { type: 'string' },
    },
    required: [
      'entryType',
      'title',
      'slugHint',
      'category',
      'theme',
      'subthemes',
      'summary',
      'whyItMatters',
      'notes',
      'keywords',
      'status',
      'sourceType',
      'sourceUrl',
    ],
  };

  const body = {
    model: process.env.INGEST_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You classify inbox submissions for a personal wiki. Decide whether each submission should become a published term or a queued reading lead. Use short, editorial, high-signal prose. Terms should usually be `published`; links, articles, essays, or broad prompts should usually be `to-read` reads. Prefer broad readable themes such as Law, Urban Economics, Political theory, Culture, Media, Technology, History, or Temperament. Subthemes should be compact nouns or noun phrases.',
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            submission_text: payload.submissionText,
            source_url: payload.sourceUrl,
            source_type: payload.sourceType,
            added_via: payload.addedVia,
            submitter: payload.submitter,
          },
          null,
          2,
        ),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'library_ingest',
        strict: true,
        schema,
      },
    },
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI classification failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI classification returned no structured content.');
  }

  return JSON.parse(content);
}

function buildTermEntry(classification, payload, slug) {
  return {
    type: 'term',
    title: classification.title.trim(),
    slug,
    category: (classification.category || 'Uncategorized').trim(),
    subthemes: Array.isArray(classification.subthemes) ? classification.subthemes.filter(Boolean) : [],
    summary: classification.summary.trim(),
    whyItMatters: classification.whyItMatters.trim(),
    notes: classification.notes.trim(),
    keywords: Array.isArray(classification.keywords) ? classification.keywords.filter(Boolean) : [],
    source: {
      type: classification.sourceType || 'term',
      ...(classification.sourceUrl ? { url: classification.sourceUrl } : {}),
      ...(payload.submitter ? { label: payload.submitter } : {}),
    },
    addedVia: payload.addedVia,
    submittedAt: new Date().toISOString(),
  };
}

function buildReadEntry(classification, payload, slug) {
  return {
    type: 'read',
    title: classification.title.trim(),
    slug,
    theme: (classification.theme || 'Unsorted').trim(),
    subthemes: Array.isArray(classification.subthemes) ? classification.subthemes.filter(Boolean) : [],
    summary: classification.summary.trim(),
    whyItMatters: classification.whyItMatters.trim(),
    notes: classification.notes.trim(),
    keywords: Array.isArray(classification.keywords) ? classification.keywords.filter(Boolean) : [],
    status: classification.status === 'published' ? 'published' : 'to-read',
    source: {
      type: classification.sourceType || 'webpage',
      ...(classification.sourceUrl ? { url: classification.sourceUrl } : {}),
      ...(payload.submitter ? { label: payload.submitter } : {}),
    },
    addedVia: payload.addedVia,
    submittedAt: new Date().toISOString(),
  };
}

function mapTermEntryToSupabase(entry) {
  return {
    title: entry.title,
    slug: entry.slug,
    category: entry.category,
    subthemes: entry.subthemes,
    summary: entry.summary,
    why_it_matters: entry.whyItMatters ?? null,
    notes: entry.notes ?? null,
    keywords: entry.keywords,
    source_type: entry.source?.type ?? null,
    source_url: entry.source?.url ?? null,
    source_label: entry.source?.label ?? null,
    added_via: entry.addedVia ?? null,
    submitted_at: entry.submittedAt ?? null,
  };
}

function mapReadEntryToSupabase(entry) {
  return {
    title: entry.title,
    slug: entry.slug,
    theme: entry.theme,
    subthemes: entry.subthemes,
    summary: entry.summary,
    why_it_matters: entry.whyItMatters ?? null,
    notes: entry.notes ?? null,
    keywords: entry.keywords,
    status: entry.status,
    source_type: entry.source?.type ?? null,
    source_url: entry.source?.url ?? null,
    source_label: entry.source?.label ?? null,
    added_via: entry.addedVia ?? null,
    submitted_at: entry.submittedAt ?? null,
  };
}

function writeResult(result) {
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result));
}

function persistToFiles(classification, payload) {
  mkdirSync(termsDir, { recursive: true });
  mkdirSync(readsDir, { recursive: true });

  if (classification.entryType === 'term') {
    const slug = ensureUniqueSlugInDirectory(termsDir, slugify(classification.slugHint || classification.title));
    const entry = buildTermEntry(classification, payload, slug);
    const filePath = path.join(termsDir, `${slug}.json`);
    writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');

    execFileSync('node', ['scripts/sync-library.mjs'], { cwd: projectRoot, stdio: 'inherit' });

    return {
      type: entry.type,
      title: entry.title,
      slug: entry.slug,
      filePath: path.relative(projectRoot, filePath),
      autoMerge: payload.autoMerge,
      addedVia: payload.addedVia,
      persistedTo: 'files',
    };
  }

  const slug = ensureUniqueSlugInDirectory(readsDir, slugify(classification.slugHint || classification.title));
  const entry = buildReadEntry(classification, payload, slug);
  const filePath = path.join(readsDir, `${slug}.json`);
  writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');

  execFileSync('node', ['scripts/sync-library.mjs'], { cwd: projectRoot, stdio: 'inherit' });

  return {
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    filePath: path.relative(projectRoot, filePath),
    autoMerge: payload.autoMerge,
    addedVia: payload.addedVia,
    persistedTo: 'files',
  };
}

async function persistToSupabase(classification, payload) {
  const client = createSupabaseAdminClient();

  if (classification.entryType === 'term') {
    const slug = await ensureUniqueSlugInSupabase(client, 'terms', slugify(classification.slugHint || classification.title));
    const entry = buildTermEntry(classification, payload, slug);
    const record = mapTermEntryToSupabase(entry);
    const { error } = await client.from('terms').insert(record);

    if (error) {
      throw error;
    }

    return {
      type: entry.type,
      title: entry.title,
      slug: entry.slug,
      filePath: null,
      autoMerge: false,
      addedVia: payload.addedVia,
      persistedTo: 'supabase',
      tableName: 'terms',
    };
  }

  const slug = await ensureUniqueSlugInSupabase(client, 'reads', slugify(classification.slugHint || classification.title));
  const entry = buildReadEntry(classification, payload, slug);
  const record = mapReadEntryToSupabase(entry);
  const { error } = await client.from('reads').insert(record);

  if (error) {
    throw error;
  }

  return {
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    filePath: null,
    autoMerge: false,
    addedVia: payload.addedVia,
    persistedTo: 'supabase',
    tableName: 'reads',
  };
}

async function main() {
  const payload = readEventPayload();
  if (!payload.submissionText) {
    throw new Error('Submission text is required.');
  }

  const classification = await classifyWithAI(payload);
  const result = hasSupabaseWriteConfig()
    ? await persistToSupabase(classification, payload)
    : persistToFiles(classification, payload);

  writeResult(result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
