# Reference index on the existing domain

`wiki.enzosimier.com` serves the library through the existing Railway/Next.js service. Notion remains the editing workspace. This avoids purchasing Notion Plus or the custom-domain add-on, which the owner declined. It creates no new service or subscription and keeps the current Cloudflare CNAME.

The public website renders its own gallery, search, category filter, concept pages, reading, PDF and source archive. There is no Notion toolbar. All internal navigation and historical aliases stay on the wiki domain.

## Content and refresh

`lib/notion-data.ts` uses the pinned open-source `notion-client` package to read only the published Reference index and its two embedded collections, anonymously. It never uses a Notion session cookie, private integration token, or Railway's legacy database credential. This is a reader for Notion's public-page protocol, not the paid native custom-domain product or an official Notion API integration.

The site refreshes the shared public data cache every 60 seconds when visited. The first request after expiry can receive the cached version while a refresh runs; the next request receives the update. A visible first body paragraph supplies an entry's summary, and the remaining supported text, links, lists, images, toggles, provenance and PDF blocks are rendered. New public rows are discovered from the collections; deleted rows are not merged back from the migration copy.

The initial 21 Paper illustrations and original PDF are served locally, matched to their exact Notion attachment identifiers. A replaced Artwork file uses its fresh public Notion URL. The verified normalized snapshot in `content/notion-snapshot.json` is a fallback for a transient upstream error. A root explicitly denied or missing returns no entries. Public static source and image files remain website assets until removed from the deployment.

The public-page protocol can change independently of this project. `GET /api/library-status` reports whether the current result came from Notion or the saved snapshot, its timestamp and counts, without exposing credentials or raw records.

## Validation

```sh
npm ci
npm test
npm run validate:content
npm run build
npm start
```

The tests cover the real published schema, nested provenance, live body edits, additions/deletions, relations, safe internal links, image replacements and incomplete collections. The browser checks cover the gallery, filters, entry and reading views. A temporary Source label change was observed in a rendered page, then the original value was restored.

## Recovery

Redeploy the previous Railway release to restore its exact application. For diagnosis, `WIKI_NOTION_MODE=redirect` followed by a rebuild restores the prior Notion redirects, and `WIKI_NOTION_MODE=legacy` makes the data loader use the original Supabase/local source. Neither mode changes or deletes Notion or Supabase data. These switches are deployment configuration, not public controls.

The source archive, original migration files and artwork originals remain preserved outside the serving cache.
