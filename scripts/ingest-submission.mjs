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

function ensureUniqueSlug(directoryPath, candidateSlug) {
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

function extractPdfCandidate(html, baseUrl) {
  const patterns = [
    /(?:href|src)=["'"]([^"'"]+\.pdf(?:\?[^"'"<>\s]*)?)["'"]/i,
    /https?://[^"'"<> ]+\.pdf(?:\?[^"'"<>\s]*)?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const candidate = match[1] ?? match[0];
      try {
        return new URL(candidate, baseUrl).href;
      } catch {
        return candidate;
      }
    }
  }

  return null;
}

async function maybeCreatePdfAsset(sourceUrl, slug) {
  try {
    const sourceResponse = await fetch(sourceUrl, { redirect: 'follow' });
    if (!sourceResponse.ok) return null;

    const contentType = (sourceResponse.headers.get('content-type') ?? '').toLowerCase();
    const pdfDir = path.join(projectRoot, 'public', 'pdfs');
    mkdirSync(pdfDir, { recursive: true });
    const filePath = path.join(pdfDir, `${slug}.pdf`);

    if (contentType.includes('pdf')) {
      writeFileSync(filePath, Buffer.from(await sourceResponse.arrayBuffer()));
      return `/pdfs/${slug}.pdf`;
    }

    const html = await sourceResponse.text();
    const pdfUrl = extractPdfCandidate(html, sourceResponse.url);
    if (!pdfUrl) return null;

    const pdfResponse = await fetch(pdfUrl, { redirect: 'follow' });
    if (!pdfResponse.ok) return null;

    const pdfContentType = (pdfResponse.headers.get('content-type') ?? '').toLowerCase();
    if (!pdfContentType.includes('pdf') && !pdfUrl.toLowerCase().includes('.pdf')) return null;

    writeFileSync(filePath, Buffer.from(await pdfResponse.arrayBuffer()));
    return `/pdfs/${slug}.pdf`;
  } catch {
    return null;
  }
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

function buildTermEntry(classification, payload) {
  const slug = ensureUniqueSlug(termsDir, slugify(classification.slugHint || classification.title));

  return {
    filePath: path.join(termsDir, `${slug}.json`),
    entry: {
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
    },
  };
}

async function buildReadEntry(classification, payload) {
  const slug = ensureUniqueSlug(readsDir, slugify(classification.slugHint || classification.title));
  const pdfUrl = payload.sourceUrl ? await maybeCreatePdfAsset(payload.sourceUrl, slug) : null;

  return {
    filePath: path.join(readsDir, `${slug}.json`),
    entry: {
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
      ...(pdfUrl ? { pdfUrl } : {}),
      addedVia: payload.addedVia,
      submittedAt: new Date().toISOString(),
    },
  };
}

async function main() {
  mkdirSync(termsDir, { recursive: true });
  mkdirSync(readsDir, { recursive: true });

  const payload = readEventPayload();
  if (!payload.submissionText) {
    throw new Error('Submission text is required.');
  }

  const classification = await classifyWithAI(payload);
  const target =
    classification.entryType === 'term'
      ? buildTermEntry(classification, payload)
      : await buildReadEntry(classification, payload);

  writeFileSync(target.filePath, `${JSON.stringify(target.entry, null, 2)}\n`, 'utf8');
  execFileSync('node', ['scripts/sync-library.mjs'], { cwd: projectRoot, stdio: 'inherit' });

  const result = {
    type: target.entry.type,
    title: target.entry.title,
    slug: target.entry.slug,
    filePath: path.relative(projectRoot, target.filePath),
    autoMerge: payload.autoMerge,
    addedVia: payload.addedVia,
  };

  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
