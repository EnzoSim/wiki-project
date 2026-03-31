# wiki-project
Interactive economics wiki prototype from `wiki_master.md`, now styled as a polished editorial browsing experience and ready to self-host on Railway.

Run locally:
- npm install
- npm run dev
- npm run build
- npm run start

Railway:
- create a Railway project with `railway init --name wiki-master`
- if your Railway account has GitHub access configured, add a GitHub-linked service with `railway add --service wiki-master-web --repo EnzoSim/wiki-project`
- otherwise create an empty service and deploy the repo with `railway up --service wiki-master-web`
- Railway will pick up the standalone Next.js build from `package.json`
- generate a Railway public domain with `railway domain --service wiki-master-web` once the deploy succeeds

Features:
- Parses the wiki_master.md seed
- Auto-groups concepts by category
- Generates a concept-specific SVG illustration
- Supports search/filtering in the browser
- Adds category-driven discovery and richer concept pages
- Uses Next.js standalone output for Railway-friendly deployments
