import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, '.next', 'standalone');
const standaloneNextRoot = path.join(standaloneRoot, '.next');
const staticSource = path.join(projectRoot, '.next', 'static');
const staticTarget = path.join(standaloneNextRoot, 'static');
const publicSource = path.join(projectRoot, 'public');
const publicTarget = path.join(standaloneRoot, 'public');
const contentSource = path.join(projectRoot, 'content');
const contentTarget = path.join(standaloneRoot, 'content');
const scriptsSource = path.join(projectRoot, 'scripts');
const scriptsTarget = path.join(standaloneRoot, 'scripts');
const wikiSource = path.join(projectRoot, 'wiki_master.md');
const wikiTarget = path.join(standaloneRoot, 'wiki_master.md');

if (!existsSync(standaloneRoot)) {
  throw new Error('Expected .next/standalone to exist. Run `next build` before preparing the standalone bundle.');
}

mkdirSync(standaloneNextRoot, { recursive: true });

if (existsSync(staticSource)) {
  cpSync(staticSource, staticTarget, { force: true, recursive: true });
}

if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { force: true, recursive: true });
}

if (existsSync(contentSource)) {
  cpSync(contentSource, contentTarget, { force: true, recursive: true });
}

if (existsSync(scriptsSource)) {
  cpSync(scriptsSource, scriptsTarget, { force: true, recursive: true });
}

if (existsSync(wikiSource)) {
  cpSync(wikiSource, wikiTarget, { force: true });
}
