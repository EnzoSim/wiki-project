# wiki-project
Interactive reference library with published terms, a queued reading list, and a GitHub-native ingestion workflow that can classify raw submissions before deploy.

Personal website: https://enzosimier.com

Run locally:
- npm install
- npm run dev
- npm run validate:content
- npm run sync:library
- npm run build
- npm run start

Railway:
- create a Railway project with railway init --name wiki-master
- if your Railway account has GitHub access configured, add a GitHub-linked service with railway add --service wiki-master-web --repo EnzoSim/wiki-project
- otherwise create an empty service and deploy the repo with railway up --service wiki-master-web
- Railway will pick up the standalone Next.js build from package.json
- generate a Railway public domain with railway domain --service wiki-master-web once the deploy succeeds

Features:
- Uses structured JSON entries under `content/terms` and `content/reads`
- Generates `wiki_master.md` from published terms for a compact export view
- Supports search/filtering for published terms
- Adds a themed `To read` queue with automatic subtheme grouping
- Includes a GitHub Action for AI-assisted or heuristic inbox classification
- Uses Next.js standalone output for Railway-friendly deployments

Content model:
- `content/terms/*.json` is the source of truth for published concepts
- `content/reads/*.json` stores queued or published reading leads
- `wiki_master.md` is generated from the term files via `npm run sync:library`

Automation:
- Workflow: `.github/workflows/ingest-library-submission.yml`
- Trigger it manually with `workflow_dispatch`, or externally with `repository_dispatch`
- Set repo secret `OPENAI_API_KEY` to enable AI classification
- Optional repo variable `INGEST_MODEL` can override the default model
- Without an API key, the ingestion script falls back to heuristic classification

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
