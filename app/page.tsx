import Link from 'next/link';
import WikiBrowser from '../components/wiki-browser';
import styles from './page.module.css';
import { getWikiOverview, loadWikiConcepts } from '../lib/wiki';

export default function HomePage() {
  const concepts = loadWikiConcepts();
  const overview = getWikiOverview(concepts);
  const categories = overview.categories;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Wiki Master</p>
          <h1 className={styles.title}>Economics concepts, staged like an editorial atlas.</h1>
          <p className={styles.lede}>
            Browse a markdown-seeded economics wiki with cleaner hierarchy, richer discovery,
            and a tighter homepage focus.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#browse">
              Explore concepts
            </a>
          </div>
        </div>
      </section>

      <section className={styles.keywordBand} aria-label="Trending keyword topics">
        {overview.topKeywords.slice(0, 7).map(({ keyword, count }) => (
          <div key={keyword} className={styles.keywordBandItem}>
            <span>{keyword}</span>
            <strong>{count} concepts</strong>
          </div>
        ))}
      </section>

      <section className={styles.categorySection} aria-labelledby="category-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Explore by domain</p>
          <h2 id="category-heading">A compact map of the wiki’s coverage.</h2>
        </div>
        <div className={styles.categoryRail}>
          {categories.map((category) => (
            <div key={category.category} className={styles.categoryBlock}>
              <div>
                <p>{category.category}</p>
                <span>{category.count} entries</span>
              </div>
              <div className={styles.categoryKeywords}>
                {category.topKeywords.slice(0, 3).map(({ keyword }) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
              <ul>
                {category.featuredConcepts.map((concept) => (
                  <li key={concept.slug}>
                    <Link href={'/concepts/' + concept.slug}>{concept.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.browserSection} id="browse">
        <div className={styles.browserIntro}>
          <div>
            <p className={styles.sectionLabel}>Browse the archive</p>
            <h2>Search, filter, and jump straight into a concept dossier.</h2>
          </div>
          <p>
            The experience now surfaces categories, keyword cues, and cleaner result states so
            the prototype is easier to scan at a glance.
          </p>
        </div>
        <WikiBrowser concepts={concepts} />
      </section>
    </main>
  );
}
