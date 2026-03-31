'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Concept } from '../lib/wiki';

export default function WikiBrowser({ concepts }: { concepts: Concept[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return concepts;
    return concepts.filter((concept) => [concept.title, concept.category, concept.summary, concept.keywords.join(' ')].join(' ').toLowerCase().includes(q));
  }, [concepts, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-600">Search concepts</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search urban economics concepts" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((concept) => (
          <Link key={concept.slug} href={`/concepts/${concept.slug}`} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-xs uppercase tracking-widest text-slate-400">{concept.category}</div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{concept.title}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">{concept.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">{concept.keywords.slice(0, 4).map((keyword) => <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{keyword}</span>)}</div>
            <div className="mt-4 text-sm font-medium text-blue-600 group-hover:underline">Open page</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
