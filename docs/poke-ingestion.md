# Poke Ingestion

The wiki now accepts live submissions through GitHub `repository_dispatch`. When the workflow receives a submission, it classifies it and writes directly into Supabase, so the content can show up on the site without a full app redeploy.

## What Poke Needs To Send

Create a webhook or HTTP action in Poke with:

- Method: `POST`
- URL: `https://api.github.com/repos/EnzoSim/wiki-project/dispatches`

Headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer <GITHUB_PAT>
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json
```

Body:

```json
{
  "event_type": "ingest-library-submission",
  "client_payload": {
    "submission_text": "A new paper on zoning politics and housing supply in large metros.",
    "source_url": "https://example.com/paper",
    "source_type": "paper",
    "added_via": "poke",
    "submitter": "Enzo",
    "auto_merge": false
  }
}
```

## GitHub Token

Create a fine-grained GitHub personal access token scoped to:

- Repository: `EnzoSim/wiki-project`
- Permission: `Contents` -> `Write`

Store that token inside Poke as a secret and use it in the `Authorization` header.

## Recommended Submission Formats

### New term

Use this when you want the item to become a published concept page:

```text
renege: to go back on a promise, undertaking, or commitment.
```

Suggested payload:

```json
{
  "event_type": "ingest-library-submission",
  "client_payload": {
    "submission_text": "renege: to go back on a promise, undertaking, or commitment.",
    "source_type": "term",
    "added_via": "poke",
    "submitter": "Enzo"
  }
}
```

### New read / article / link

Use this when you want the item to go to the reading queue:

```text
https://example.com/article
Why it matters: strong piece on zoning politics and local veto power.
```

Suggested payload:

```json
{
  "event_type": "ingest-library-submission",
  "client_payload": {
    "submission_text": "https://example.com/article\nWhy it matters: strong piece on zoning politics and local veto power.",
    "source_url": "https://example.com/article",
    "source_type": "article",
    "added_via": "poke",
    "submitter": "Enzo"
  }
}
```

### Link only

This works, but the classifier has less context. Better results come from adding one short sentence.

```json
{
  "event_type": "ingest-library-submission",
  "client_payload": {
    "submission_text": "https://example.com/article",
    "source_url": "https://example.com/article",
    "source_type": "webpage",
    "added_via": "poke",
    "submitter": "Enzo"
  }
}
```

## What Happens After The Request

1. GitHub triggers `.github/workflows/ingest-library-submission.yml`.
2. The workflow runs `scripts/ingest-submission.mjs`.
3. Because `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured, the submission is written straight to Supabase.
4. The live site reads from Supabase at request time.
5. New content can appear without rebuilding the whole app.

## Manual Test

You can manually test the same flow from your terminal:

```bash
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <GITHUB_PAT>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/EnzoSim/wiki-project/dispatches \
  -d '{
    "event_type": "ingest-library-submission",
    "client_payload": {
      "submission_text": "anathema: a person or thing intensely disliked or loathed.",
      "source_type": "term",
      "added_via": "manual-test",
      "submitter": "Enzo"
    }
  }'
```
