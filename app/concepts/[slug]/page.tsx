import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildConceptImageSvg, buildConceptPrompt, getConceptBySlug, loadWikiConcepts } from '../../../lib/wiki';

export default function ConceptPage({ params }: { params: { slug: string } }) {
  const concept = getConceptBySlug(params.slug);
  if (!concept) return notFound();
  const allConcepts = loadWikiConcepts();
  const relatedConcepts = allConcepts.filter((item) => concept.related.includes(item.slug));
  const imageSrc = buildConceptImageSvg(concept);
  const prompt = buildConceptPrompt(concept);
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">← Back to wiki</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{concept.category}</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{concept.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">{concept.summary}</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Auto-image enrichment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This prototype generates a concept-specific editorial illustration from the concept metadata, so every page has a visual even before a full media pipeline is connected.</p>
            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200"><img src={imageSrc} alt={concept.title} className="w-full" /></div>
          </div>
        </section>
        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Metadata</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-slate-500">Slug</dt><dd className="mt-1 font-medium text-slate-900">{concept.slug}</dd></div>
              <div><dt className="text-slate-500">Keywords</dt><dd className="mt-1 flex flex-wrap gap-2">{concept.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{keyword}</span>)}</dd></div>
            </dl>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Auto-generated prompt</h2><p className="mt-3 text-sm leading-6 text-slate-600">{prompt}</p></div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Related concepts</h2><div className="mt-4 space-y-3 text-sm">{relatedConcepts.length > 0 ? relatedConcepts.map((item) => <Link key={item.slug} href={`/concepts/${item.slug}`} className="block rounded-2xl bg-slate-50 px-4 py-3 hover:bg-slate-100">{item.title}</Link>) : <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">No related concepts yet. Add more entries to wiki_master.md to create links automatically.</div>}</div></div>
        </aside>
      </div>
    </main>
  );
}
