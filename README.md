# wiki-project
Interactive reference library with published terms, a queued reading list, and a GitHub-native ingestion workflow that can classify raw submissions before they land in the live site.

Personal website: https://enzosimier.com

Run locally:
- npm install
- npm run dev
- npm run validate:content
- npm run sync:library
- npm run migrate:supabase
- npm run build
- npm run start

Railway:
- create a Railway project with `railway init --name wiki-master`
- if your Railway account has GitHub access configured, add a GitHub-linked service with `railway add --service wiki-master-web --repo EnzoSim/wiki-project`
- otherwise create an empty service and deploy the repo with `railway up --service wiki-master-web`
- Railway will pick up the standalone Next.js build from `package.json`
- generate a Railway public domain with `railway domain --service wiki-master-web` once the deploy succeeds

Features:
- Reads live content from Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured
- Falls back to structured JSON entries under `content/terms` and `content/reads` when Supabase is not configured
- Generates `wiki_master.md` from published terms for a compact export view
- Supports search/filtering for published terms
- Adds a themed `To read` queue with automatic subtheme grouping
- Supports PDF-aware reading entries
- Includes a GitHub Action for AI-assisted or heuristic inbox classification
- Uses Next.js standalone output for Railway-friendly deployments

Content model:
- `content/terms/*.json` and `content/reads/*.json` are the seed/fallback content layer
- `wiki_master.md` is generated from the local term files via `npm run sync:library`
- When Supabase is connected, the production site reads from the database at request time instead of from the bundled files

Supabase setup:
- Create a Supabase project
- Run [supabase/schema.sql](/Users/enzo_simier/Desktop/wiki-project/supabase/schema.sql) in the Supabase SQL editor
- Set Railway variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Set GitHub Action secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Optionally keep local equivalents in [.env.example](/Users/enzo_simier/Desktop/wiki-project/.env.example)
- Seed the database from the current JSON files with `npm run migrate:supabase`

Automation:
- Workflow: `.github/workflows/ingest-library-submission.yml`
- Trigger it manually with `workflow_dispatch`, or externally with `repository_dispatch`
- Set repo secret `OPENAI_API_KEY` to enable AI classification
- Optional repo variable `INGEST_MODEL` can override the default model
- Without an API key, the ingestion script falls back to heuristic classification
- When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present in GitHub Actions, submissions are written straight to Supabase instead of opening a content PR
- For the exact Poke bridge payload and webhook format, see [docs/poke-ingestion.md](/Users/enzo_simier/Desktop/wiki-project/docs/poke-ingestion.md)

`repository_dispatch` payload example:

```bash
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <GITHUB_PAT>" \
  https://api.github.com/repos/EnzoSim/wiki-project/dispatches \
  -d '{
    "event_type": "ingest-library-submission",
    "client_payload": {
      "submission_text": "A new paper on zoning politics and housing supply in large metros.",
      "source_url": "https://example.com/paper",
      "source_type": "paper",
      "added_via": "poke",
      "submitter": "Enzo",
      "auto_merge": false
    }
  }'
```
