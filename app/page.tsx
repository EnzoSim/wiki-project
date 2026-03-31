import WikiBrowser from '../components/wiki-browser';
import styles from './page.module.css';
import { getWikiOverview, loadWikiConcepts } from '../lib/wiki';

export default function HomePage() {
  const concepts = loadWikiConcepts();
  const overview = getWikiOverview(concepts);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Wiki Master</p>
          <h1 className={styles.title}>Three short entries, kept deliberately spare.</h1>
          <p className={styles.lede}>
            A compact reference on law, public policy, and urban economics. Search the index,
            filter by category, and move directly into a term without extra visual noise.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#browse">
              Browse the index
            </a>
          </div>
        </div>
        <aside className={styles.heroMeta} aria-label="Archive summary">
          <div>
            <p className={styles.sectionLabel}>Archive</p>
            <div className={styles.statRow}>
              <div className={styles.statBlock}>
                <span className={styles.statLabel}>Entries</span>
                <strong className={styles.statValue}>{overview.totalConcepts}</strong>
              </div>
              <div className={styles.statBlock}>
                <span className={styles.statLabel}>Categories</span>
                <strong className={styles.statValue}>{overview.totalCategories}</strong>
              </div>
            </div>
          </div>
          <ul className={styles.categoryList}>
            {overview.categories.map((category) => (
              <li key={category.category}>{category.category}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className={styles.indexSection} id="browse">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Index</p>
            <h2>Browse the current archive.</h2>
          </div>
          <p className={styles.sectionCopy}>
            The dataset is intentionally small: three live terms, one search field, and category
            filters that stay out of the way.
          </p>
        </div>
        <WikiBrowser concepts={concepts} />
      </section>
    </main>
  );
}
