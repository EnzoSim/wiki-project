import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const termsDir = path.join(projectRoot, 'content', 'terms');
const readsDir = path.join(projectRoot, 'content', 'reads');

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

function createSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this migration.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function readJsonDirectory(directoryPath) {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => JSON.parse(readFileSync(path.join(directoryPath, fileName), 'utf8')));
}

function mapTerm(entry) {
  return {
    title: entry.title,
    slug: entry.slug,
    category: entry.category,
    subthemes: Array.isArray(entry.subthemes) ? entry.subthemes : [],
    summary: entry.summary,
    why_it_matters: entry.whyItMatters ?? null,
    notes: entry.notes ?? null,
    keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
    source_type: entry.source?.type ?? null,
    source_url: entry.source?.url ?? null,
    source_label: entry.source?.label ?? null,
    added_via: entry.addedVia ?? null,
    submitted_at: entry.submittedAt ?? null,
  };
}

function mapRead(entry) {
  return {
    title: entry.title,
    slug: entry.slug,
    theme: entry.theme,
    subthemes: Array.isArray(entry.subthemes) ? entry.subthemes : [],
    summary: entry.summary,
    why_it_matters: entry.whyItMatters ?? null,
    notes: entry.notes ?? null,
    keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
    status: entry.status ?? 'to-read',
    source_type: entry.source?.type ?? null,
    source_url: entry.source?.url ?? null,
    source_label: entry.source?.label ?? null,
    added_via: entry.addedVia ?? null,
    submitted_at: entry.submittedAt ?? null,
  };
}

async function upsertTable(client, tableName, rows) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from(tableName).upsert(rows, { onConflict: 'slug' });

  if (error) {
    throw error;
  }
}

async function main() {
  const client = createSupabaseAdminClient();
  const terms = readJsonDirectory(termsDir).map(mapTerm);
  const reads = readJsonDirectory(readsDir).map(mapRead);

  await upsertTable(client, 'terms', terms);
  await upsertTable(client, 'reads', reads);

  console.log(
    JSON.stringify(
      {
        terms: terms.length,
        reads: reads.length,
        target: getSupabaseUrl(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
