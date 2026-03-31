import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, '.next', 'standalone');
const standaloneNextRoot = path.join(standaloneRoot, '.next');
const staticSource = path.join(projectRoot, '.next', 'static');
const staticTarget = path.join(standaloneNextRoot, 'static');
const publicSource = path.join(projectRoot, 'public');
const publicTarget = path.join(standaloneRoot, 'public');

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
