import WikiBrowser from '../components/wiki-browser';
import styles from './page.module.css';
import { loadWikiConcepts } from '../lib/wiki';

export default function HomePage() {
  const concepts = loadWikiConcepts();
  const categories = Array.from(new Set(concepts.map((concept) => concept.category)));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Wiki Master</p>
        <h1>Reference index</h1>
        <p className={styles.intro}>
          A small encyclopedia-style index of unusual terms across law, public policy, urban
          economics, and adjacent domains.
        </p>
        <p className={styles.credit}>Curated by Enzo Simier.</p>
        <p className={styles.meta}>
          {concepts.length} entries across {categories.length} categories.
        </p>
      </header>

      <section className={styles.indexSection} aria-labelledby="index-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Index</p>
            <h2 id="index-heading">Current entries</h2>
          </div>
          <p className={styles.sectionCopy}>
            Use the search field or filter by category to move directly to a term.
          </p>
        </div>
        <WikiBrowser concepts={concepts} />
      </section>
    </main>
  );
}
