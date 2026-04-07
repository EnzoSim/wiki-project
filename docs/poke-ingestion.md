# Poke Ingestion

The easiest live setup is now the private bridge endpoint on the wiki app itself. Poke sends a single authenticated `POST` to the bridge, the bridge runs the existing ingestion flow, and the content is written directly into Supabase.

## Recommended Setup: Direct Bridge

Create a webhook or HTTP action in Poke with:

- Method: `POST`
- URL: `https://wiki.enzosimier.com/api/poke`

Headers:

```text
Authorization: Bearer <POKE_WEBHOOK_SECRET>
Content-Type: application/json
```

Body:

```json
{
  "submission_text": "A new paper on zoning politics and housing supply in large metros.",
  "source_url": "https://example.com/paper",
  "source_type": "paper",
  "category": "",
  "added_via": "poke",
  "submitter": "Enzo"
}
```

## Required Railway Secret

Set this server-side variable on the Railway `wiki-project` service:

```env
POKE_WEBHOOK_SECRET=choose-a-long-random-secret
```

The bridge accepts either:

- `Authorization: Bearer <POKE_WEBHOOK_SECRET>`
- or `X-Poke-Secret: <POKE_WEBHOOK_SECRET>`

## Recommended Submission Formats

### New term

Use this when you want the item to become a published concept page:

```json
{
  "submission_text": "renege: to go back on a promise, undertaking, or commitment.",
  "source_type": "term",
  "category": "Language",
  "added_via": "poke",
  "submitter": "Enzo"
}
```

### New read / article / link

Use this when you want the item to go to the reading queue:

```json
{
  "submission_text": "https://example.com/article\nWhy it matters: strong piece on zoning politics and local veto power.",
  "source_url": "https://example.com/article",
  "source_type": "article",
  "added_via": "poke",
  "submitter": "Enzo"
}
```

### Link only

This works, but the classifier has less context. Better results come from adding one short sentence.

```json
{
  "submission_text": "https://example.com/article",
  "source_url": "https://example.com/article",
  "source_type": "webpage",
  "added_via": "poke",
  "submitter": "Enzo"
}
```

## Response Format

When the bridge succeeds, it returns JSON like:

```json
{
  "ok": true,
  "result": {
    "type": "term",
    "title": "renege",
    "slug": "renege",
    "filePath": null,
    "autoMerge": false,
    "addedVia": "poke",
    "persistedTo": "supabase",
    "tableName": "terms"
  }
}
```

## What Happens After The Request

1. Poke sends the authenticated request to `https://wiki.enzosimier.com/api/poke`.
2. The bridge runs `scripts/ingest-submission.mjs`.
3. The ingestion logic classifies the submission.
4. Because `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured, the submission is written directly into Supabase.
5. The live site reads from Supabase at request time.
6. New content can appear without rebuilding the whole app.

## Fallback: GitHub Repository Dispatch

If you ever want to use GitHub directly instead of the bridge, the workflow still supports `repository_dispatch` through `.github/workflows/ingest-library-submission.yml`.
