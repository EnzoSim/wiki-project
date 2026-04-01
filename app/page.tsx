import WikiBrowser from '../components/wiki-browser';
import styles from './page.module.css';
import { loadWikiConcepts } from '../lib/wiki';

export default function HomePage() {
  const concepts = loadWikiConcepts();
  const categories = Array.from(new Set(concepts.map((concept) => concept.category)));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>Wiki Master</p>
          <h1>Reference index</h1>
          <p className={styles.intro}>
            Three terms, kept deliberately small: readable entries with premium visual studies
            rather than a noisy archive.
          </p>
        </div>
        <dl className={styles.metaRail}>
          <div>
            <dt>Entries</dt>
            <dd>{concepts.length}</dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>{categories.length}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Essay + 3D study</dd>
          </div>
        </dl>
      </header>

      <section className={styles.indexSection} aria-labelledby="index-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Current index</p>
            <h2 id="index-heading">Browse the published terms</h2>
          </div>
          <p className={styles.sectionCopy}>
            Search, filter by category, then open a term to read the essay and inspect its 3D
            interpretation.
          </p>
        </div>
        <WikiBrowser concepts={concepts} />
      </section>
    </main>
  );
}
