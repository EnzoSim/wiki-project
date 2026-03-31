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

  const highlightedKeywords = useMemo(() => {
    const counts = new Map<string, number>();

    concepts.forEach((concept) => {
      concept.keywords.forEach((keyword) => {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([keyword]) => keyword);
  }, [concepts]);

  return (
    <div className={styles.browser}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <label className={styles.searchLabel} htmlFor="concept-search">
            Search concepts
          </label>
          <input
            id="concept-search"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              startTransition(() => setQuery(nextQuery));
            }}
            placeholder="Search housing, taxation, zoning, spillovers..."
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
          Showing <strong>{filtered.length}</strong> of <strong>{concepts.length}</strong>{' '}
          concepts
        </p>
        <div className={styles.keywordRow}>
          {highlightedKeywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className={styles.keywordChip}
              onClick={() => {
                startTransition(() => setQuery(keyword));
              }}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((concept) => (
            <Link key={concept.slug} href={`/concepts/${concept.slug}`} className={styles.card}>
              <div className={styles.cardTopline}>
                <span>{concept.category}</span>
                <strong>{concept.related.length} links</strong>
              </div>
              <h3>{concept.title}</h3>
              <p>{concept.summary}</p>
              <div className={styles.cardKeywords}>
                {concept.keywords.slice(0, 4).map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
              <div className={styles.cardAction}>Open dossier</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No concepts match that search yet.</h3>
          <p>Try a broader term, switch categories, or reset the filters to reopen the full archive.</p>
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
        </div>
      )}
    </div>
  );
}
