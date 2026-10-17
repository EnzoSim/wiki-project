'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './wiki-browser.module.css';
import type { Concept } from '../lib/wiki';

type Card = Pick<Concept, 'title' | 'slug' | 'category' | 'summary' | 'keywords' | 'artwork'>;

export default function WikiBrowser({ concepts }: { concepts: Card[] }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [view, setView] = useState<'gallery' | 'index'>('gallery');
  const deferredQuery = useDeferredValue(query);
  const categories = useMemo(
    () => [...new Set(concepts.map((concept) => concept.category))].sort(),
    [concepts],
  );
  const filtered = useMemo(() => {
    const term = deferredQuery.toLowerCase().trim();
    return concepts.filter(
      (concept) =>
        (selectedCategory === 'All' || concept.category === selectedCategory) &&
        (!term ||
          [concept.title, concept.category, concept.summary, ...concept.keywords]
            .join(' ')
            .toLowerCase()
            .includes(term)),
    );
  }, [concepts, deferredQuery, selectedCategory]);
  return (
    <div className={styles.browser}>
      <div className={styles.controls}>
        <div className={styles.views} aria-label="View">
          <button
            type="button"
            aria-pressed={view === 'gallery'}
            onClick={() => setView('gallery')}
          >
            Gallery
          </button>
          <button type="button" aria-pressed={view === 'index'} onClick={() => setView('index')}>
            Index
          </button>
        </div>
        <div className={styles.filters}>
          <label>
            <span className={styles.label}>Category</span>
            <select
              aria-label="Category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.label}>Search the lexicon</span>
            <input
              type="search"
              aria-label="Search the lexicon"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the lexicon…"
            />
          </label>
        </div>
      </div>
      {query || selectedCategory !== 'All' ? (
        <p className={styles.status} role="status">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} found{' '}
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory('All');
            }}
          >
            Clear filters
          </button>
        </p>
      ) : null}
      {filtered.length ? (
        <div className={view === 'gallery' ? styles.gallery : styles.index}>
          {filtered.map((concept, index) => (
            <article key={concept.slug} className={styles.item}>
              <Link
                className={styles.card}
                aria-label={concept.title}
                href={`/concepts/${concept.slug}`}
              >
                {view === 'gallery' && concept.artwork ? (
                  <div className={styles.image}>
                    <img
                      src={concept.artwork.thumbnail || concept.artwork.full}
                      alt={`${concept.title} — ${concept.summary}`}
                      width={720}
                      height={480}
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                  </div>
                ) : null}
                <div className={styles.copy}>
                  <span className={styles.category}>{concept.category}</span>
                  <h3>{concept.title}</h3>
                  <p>{concept.summary}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h3>No entries found.</h3>
          <p>Try another term or clear the filters.</p>
        </div>
      )}
    </div>
  );
}
