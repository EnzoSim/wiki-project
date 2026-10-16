import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePublicLibrary, safeHref } from '../lib/notion-data.ts';
const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const fixture = read('./notion-public-fixture.json');
const assets = read('../content/notion-artwork.json');
const config = {
  rootId: '3fb314f9-feab-81ab-a2ee-e315b6e44f26',
  termsId: 'db9b2836-1275-4303-91f7-ffb8ef0513a4',
  readsId: '5dc71a00-1e5f-450d-bd97-31c61b0d3641',
};
const atm = '3fb314f9-feab-8162-bf24-f1d4273eb147';
const otm = '3fb314f9-feab-8175-9c3d-c5acba244c3f';
const fresh = () => structuredClone(fixture);

test('reads actual public collection rows, full body, local artwork and the original PDF', () => {
  const library = parsePublicLibrary(fresh(), config, assets);
  assert.equal(library.concepts.length, 2);
  assert.equal(library.readings.length, 1);
  const entry = library.concepts.find((x) => x.notionId === atm);
  assert.equal(
    entry.summary,
    'An option where the strike price is identical to the current market price of the underlying asset.',
  );
  assert.equal(entry.artwork.full, '/artwork/at-the-money-atm.webp');
  assert.equal(entry.body[0].source, entry.artwork.full);
  assert.ok(
    entry.body.some((x) => x.type === 'toggle' && x.children.some((c) => c.type === 'code')),
  );
  assert.equal(library.readings[0].pdfUrl, '/pdfs/complete-biosynthesis-of-nicotine.pdf');
  assert.equal(
    library.intro,
    'A personal library of concepts, connections and things worth reading.',
  );
});
test('new Notion rows appear and live body edits override the migration copy', () => {
  const map = fresh();
  const page = map.block[atm].value;
  const paragraph = page.content.find((id) => map.block[id]?.value.type === 'text');
  map.block[paragraph].value.properties.title = [['Edited directly in Notion.']];
  const newId = '11111111-2222-4333-8444-555555555555';
  map.block[newId] = {
    value: {
      id: newId,
      type: 'page',
      alive: true,
      parent_id: config.termsId,
      properties: { title: [['Nouveau concept']], uWgi: [['A new published definition.']] },
    },
  };
  const library = parsePublicLibrary(map, config, assets);
  assert.equal(library.concepts.length, 3);
  assert.equal(
    library.concepts.find((x) => x.notionId === atm).summary,
    'Edited directly in Notion.',
  );
  assert.equal(library.concepts.find((x) => x.notionId === newId).slug, 'nouveau-concept');
});
test('removing a row never resurrects the migrated record or unrelated pages', () => {
  const map = fresh();
  map.block[atm].value.alive = false;
  map.block.rogue = {
    value: {
      id: 'rogue',
      type: 'page',
      parent_id: 'another-collection',
      properties: { title: [['Unrelated page']] },
    },
  };
  const library = parsePublicLibrary(map, config, assets);
  assert.equal(library.concepts.length, 1);
  assert.equal(library.concepts[0].notionId, otm);
});
test('rewrites internal links and relations while rejecting executable URLs', () => {
  const map = fresh();
  const page = map.block[atm].value;
  page.properties['{{Sj'] = [['‣', [['p', otm]]]];
  const paragraph = page.content.find((id) => map.block[id]?.value.type === 'text');
  map.block[paragraph].value.properties.title = [
    ['Safe link', [['a', 'https://app.notion.com/p/' + otm.replaceAll('-', '')]]],
    [' bad', [['a', 'javascript:alert(1)']]],
    ['‣', [['p', otm]]],
  ];
  const entry = parsePublicLibrary(map, config, assets).concepts.find((x) => x.notionId === atm);
  const body = entry.body.find((x) => x.id === paragraph);
  assert.deepEqual(entry.related, ['out-of-the-money-otm']);
  assert.equal(body.rich[0].href, '/concepts/out-of-the-money-otm');
  assert.equal(body.rich[1].href, undefined);
  assert.equal(body.rich[2].text, 'Out of the Money (OTM)');
  assert.equal(body.rich[2].href, '/concepts/out-of-the-money-otm');
  assert.equal(safeHref('//evil.example'), undefined);
  assert.equal(safeHref('data:text/html,x'), undefined);
});
test('an artwork replaced in Notion uses the new public file instead of an old local image', () => {
  const map = fresh();
  const page = map.block[atm].value;
  const source = 'attachment:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:new-art.png';
  page.properties['wms['] = [['new-art.png', [['a', source]]]];
  map.signed_urls[source] = 'https://file.notion.com/new-public-file.png';
  const entry = parsePublicLibrary(map, config, assets).concepts.find((x) => x.notionId === atm);
  assert.equal(entry.artwork.full, map.signed_urls[source]);
  assert.equal(entry.artwork.thumbnail, undefined);
});
test('refuses an unavailable root and incomplete collection responses', () => {
  const map = fresh();
  delete map.block[config.rootId];
  assert.throws(() => parsePublicLibrary(map, config, assets), /NOTION_NOT_PUBLIC/);
  const partial = fresh();
  partial.collection_query = {
    [config.termsId]: { view: { collection_group_results: { hasMore: true } } },
  };
  assert.throws(() => parsePublicLibrary(partial, config, assets), /NOTION_INCOMPLETE_COLLECTION/);
});
