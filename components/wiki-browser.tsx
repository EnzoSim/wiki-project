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
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <label className={styles.searchLabel} htmlFor="concept-search">
            Search the index
          </label>
          <input
            id="concept-search"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              startTransition(() => setQuery(nextQuery));
            }}
            placeholder="Search terra nullius, safetyism, NIMBYism"
            className={styles.searchInput}
          />
        </div>
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

      <div className={styles.statusRow}>
        <p>
          Showing <strong>{filtered.length}</strong> of <strong>{concepts.length}</strong> terms
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
            Reset
          </button>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className={styles.list}>
          {filtered.map((concept, index) => (
            <Link key={concept.slug} href={`/concepts/${concept.slug}`} className={styles.item}>
              <span className={styles.itemIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.itemBody}>
                <div className={styles.itemHeader}>
                  <h3>{concept.title}</h3>
                  <span className={styles.itemCategory}>{concept.category}</span>
                </div>
                <p>{concept.summary}</p>
                <div className={styles.itemKeywords}>
                  {concept.keywords.slice(0, 3).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </div>
              <span className={styles.itemAction}>Open</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No terms match that search.</h3>
          <p>Try a broader word or reset the filters to return to the full index.</p>
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
              Reset filters
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
