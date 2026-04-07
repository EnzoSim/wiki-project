import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';

const execFileAsync = promisify(execFile);

type PokePayload = {
  submission_text?: unknown;
  source_url?: unknown;
  source_type?: unknown;
  category?: unknown;
  subthemes?: unknown;
  added_via?: unknown;
  submitter?: unknown;
  auto_merge?: unknown;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBridgeSecret() {
  return process.env.POKE_WEBHOOK_SECRET?.trim() ?? '';
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const pokeSecretHeader = request.headers.get('x-poke-secret')?.trim() ?? '';

  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return pokeSecretHeader;
}

function isAuthorized(request: Request) {
  const expected = getBridgeSecret();
  const received = readBearerToken(request);

  if (!expected || !received) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizeSubthemes(input: unknown) {
  if (Array.isArray(input)) {
    return input
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (typeof input !== 'string') {
    return [];
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return normalizeSubthemes(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizePayload(input: unknown) {
  const candidate = (input && typeof input === 'object' && 'client_payload' in input
    ? (input as { client_payload?: unknown }).client_payload
    : input) as PokePayload | undefined;

  return {
    submissionText: typeof candidate?.submission_text === 'string' ? candidate.submission_text.trim() : '',
    sourceUrl: typeof candidate?.source_url === 'string' ? candidate.source_url.trim() : '',
    sourceType: typeof candidate?.source_type === 'string' ? candidate.source_type.trim() : '',
    category: typeof candidate?.category === 'string' ? candidate.category.trim() : '',
    subthemes: normalizeSubthemes(candidate?.subthemes),
    addedVia: typeof candidate?.added_via === 'string' && candidate.added_via.trim() ? candidate.added_via.trim() : 'poke-bridge',
    submitter: typeof candidate?.submitter === 'string' ? candidate.submitter.trim() : 'Enzo',
    autoMerge: candidate?.auto_merge === true || candidate?.auto_merge === 'true',
  };
}

export async function POST(request: Request) {
  if (!getBridgeSecret()) {
    return NextResponse.json(
      { error: 'POKE_WEBHOOK_SECRET is not configured on the server.' },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = normalizePayload(body);

  if (!payload.submissionText) {
    return NextResponse.json(
      { error: 'submission_text is required.' },
      { status: 400 },
    );
  }

  const resultPath = path.join(os.tmpdir(), `wiki-poke-${randomUUID()}.json`);
  const scriptPath = path.join(process.cwd(), 'scripts', 'ingest-submission.mjs');

  try {
    await execFileAsync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        INGEST_RESULT_PATH: resultPath,
        SUBMISSION_TEXT: payload.submissionText,
        SUBMISSION_SOURCE_URL: payload.sourceUrl,
        SUBMISSION_SOURCE_TYPE: payload.sourceType,
        SUBMISSION_CATEGORY: payload.category,
        SUBMISSION_SUBTHEMES: JSON.stringify(payload.subthemes),
        SUBMISSION_ADDED_VIA: payload.addedVia,
        SUBMISSION_SUBMITTER: payload.submitter,
        SUBMISSION_AUTO_MERGE: String(payload.autoMerge),
      },
    });

    const result = JSON.parse(await readFile(resultPath, 'utf8'));
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge ingestion failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
