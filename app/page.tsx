import WikiBrowser from '../components/wiki-browser';
import { groupConceptsByCategory, loadWikiConcepts } from '../lib/wiki';

export default function HomePage() {
  const concepts = loadWikiConcepts();
  const categories = groupConceptsByCategory(concepts);
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-slate-300">
        <div className="max-w-3xl">
          <div className="text-sm uppercase tracking-[0.35em] text-slate-400">Wiki Master</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Interactive economics wiki</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Concepts are parsed from wiki_master.md, organized by category, searchable, and enriched with a generated visual per concept.</p>
        </div>
      </section>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section><WikiBrowser concepts={concepts} /></section>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Categories</div>
            <div className="mt-4 space-y-3">{Object.entries(categories).map(([category, items]) => <div key={category} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="font-medium text-slate-800">{category}</span><span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700">{items.length}</span></div>)}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Current seed</div>
            <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">NIMBYism is now live as the first concept page and has an auto-generated concept illustration.</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
