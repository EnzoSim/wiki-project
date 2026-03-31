'use client';

import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './wiki-browser.module.css';
import type { Concept } from '../lib/wiki';

function scoreConcept(concept: Concept, query: string) {
  if (!query) return 0;

  const haystacks = {
    title: concept.title.toLowerCase(),
    category: concept.category.toLowerCase(),
    summary: concept.summary.toLowerCase(),
    keywords: concept.keywords.join(' ').toLowerCase(),
  };

  let score = 0;

  if (haystacks.title.includes(query)) score += 5;
  if (haystacks.category.includes(query)) score += 3;
  if (haystacks.summary.includes(query)) score += 2;
  if (haystacks.keywords.includes(query)) score += 4;

  return score;
}

export default function WikiBrowser({ concepts }: { concepts: Concept[] }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const deferredQuery = useDeferredValue(query);
  const hasActiveFilters = query.trim().length > 0 || selectedCategory !== 'All';

  const categories = useMemo(
    () => ['All', ...new Set(concepts.map((concept) => concept.category))],
    [concepts],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.toLowerCase().trim();

    return concepts
      .filter((concept) => {
        const matchesCategory =
          selectedCategory === 'All' || concept.category === selectedCategory;
        const matchesQuery =
          !normalizedQuery ||
          [
            concept.title,
            concept.category,
            concept.summary,
            concept.keywords.join(' '),
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);

        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => {
        const scoreDelta =
          scoreConcept(right, normalizedQuery) - scoreConcept(left, normalizedQuery);

        if (scoreDelta !== 0) return scoreDelta;

        return left.title.localeCompare(right.title);
      });
  }, [concepts, deferredQuery, selectedCategory]);

  return (
    <div className={styles.browser}>
      <div className={styles.controls}>
        <div className={styles.searchRow}>
          <label className={styles.searchLabel} htmlFor="concept-search">
            Search
          </label>
          <input
            id="concept-search"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              startTransition(() => setQuery(nextQuery));
            }}
            placeholder="Search terms, categories, or keywords"
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterBlock}>
          <span className={styles.filterLabel}>Filter by category</span>
          <div className={styles.filterGroup} aria-label="Filter by category">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={category === selectedCategory ? styles.filterActive : styles.filter}
                onClick={() => {
                  startTransition(() => setSelectedCategory(category));
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.statusRow}>
        <p>
          Showing <strong>{filtered.length}</strong> of <strong>{concepts.length}</strong> entries
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              startTransition(() => {
                setQuery('');
                setSelectedCategory('All');
              });
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className={styles.list}>
          {filtered.map((concept) => (
            <article key={concept.slug} className={styles.item}>
              <div className={styles.itemHeader}>
                <Link className={styles.itemTitle} href={`/concepts/${concept.slug}`}>
                  {concept.title}
                </Link>
                <span className={styles.itemCategory}>{concept.category}</span>
              </div>
              <p className={styles.itemSummary}>{concept.summary}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No entries match that search.</h3>
          <p>Try a broader term or clear the filters to return to the full index.</p>
        </div>
      )}
    </div>
  );
}
