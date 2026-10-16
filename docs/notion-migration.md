# Notion migration

The published Reference index is https://angry-toothpaste-1c7.notion.site/Reference-index-3fb314f9feab81aba2eee315b6e44f26.

The root of `wiki.enzosimier.com`, all known concept routes and their legacy aliases, and the original reading route redirect to the corresponding Notion pages. The explicit mapping is saved in `notion-migration.json`. Unknown concept and reading routes go to the library index.

Redirects use HTTP 307 so the move remains reversible. They are enabled by default and require no Notion server credential. Editing and adding entries now happen in Notion; Poke integration is outside this migration at the user's request. The original ingestion code, source content, PDF, and Supabase data are retained for recovery.

## Validate locally

```sh
npm ci
npm run validate:content
npm run build
npm start
```

Check the root, a canonical concept, a legacy alias and the reading route. Confirm their `Location` headers against `notion-migration.json` and open the destinations without a Notion login. The original PDF path remains served.

## Roll back

Set `WIKI_NOTION_ENABLED=false` and rebuild/redeploy to restore the legacy website. The flag is read at build time because Next.js compiles the redirect rules into the deployment. Retain both data stores, the source archive, and the prior Railway deployment.
