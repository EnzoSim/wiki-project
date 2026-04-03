import ReadingQueue from '../components/reading-queue';
import WikiBrowser from '../components/wiki-browser';
import styles from './page.module.css';
import { groupReadingsByTheme, loadReadingQueue, loadWikiConcepts } from '../lib/wiki';

export default function HomePage() {
  const concepts = loadWikiConcepts();
  const readings = loadReadingQueue();
  const readingThemes = groupReadingsByTheme(readings);
  const categories = Array.from(new Set(concepts.map((concept) => concept.category)));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Wiki Master</p>
        <h1>Reference index</h1>
        <p className={styles.intro}>
          A compact library of published terms and queued reading leads, with incoming notes sorted
          into themes and subthemes before they go live.
        </p>
        <p className={styles.credit}>Curated by Enzo Simier.</p>
        <p className={styles.meta}>
          {concepts.length} published terms, {readings.length} queued reads, {categories.length}{' '}
          term categories.
        </p>
      </header>

      <section className={styles.indexSection} aria-labelledby="index-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Index</p>
            <h2 id="index-heading">Published terms</h2>
          </div>
          <p className={styles.sectionCopy}>
            Use the search field or filter by category to move directly to a term.
          </p>
        </div>
        <WikiBrowser concepts={concepts} />
      </section>

      <section className={styles.queueSection} aria-labelledby="queue-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>To read</p>
            <h2 id="queue-heading">Incoming queue</h2>
          </div>
          <p className={styles.sectionCopy}>
            New notes, links, and prompts can be classified into themes and subthemes by the repo
            ingestion workflow before they become published entries.
          </p>
        </div>
        <ReadingQueue readings={readings} themes={readingThemes} />
      </section>
    </main>
  );
}
