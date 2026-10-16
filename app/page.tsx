import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReadingQueue from '../components/reading-queue';
import WikiBrowser from '../components/wiki-browser';
import { loadPublicLibrary } from '../lib/notion';
import { loadReadingQueue, loadWikiConcepts } from '../lib/wiki';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [concepts, readings, library] = await Promise.all([
    loadWikiConcepts(),
    loadReadingQueue('all'),
    loadPublicLibrary(),
  ]);
  if (!library.available) notFound();
  const cards = concepts.map(({ title, slug, category, summary, keywords, artwork }) => ({
    title,
    slug,
    category,
    summary,
    keywords,
    artwork,
  }));
  return (
    <main id="main" className={styles.page}>
      <header className={styles.header}>
        <h1>{library.title}</h1>
        <p className={styles.intro}>{library.intro}</p>
        <p className={styles.credit}>{library.credit}</p>
      </header>
      <section className={styles.indexSection} aria-labelledby="index-heading">
        <div className={styles.sectionHeader}>
          <h2 id="index-heading">Concepts</h2>
          <p>{concepts.length} entries</p>
        </div>
        <WikiBrowser concepts={cards} />
      </section>
      <section className={styles.queueSection} aria-labelledby="queue-heading">
        <div className={styles.sectionHeader}>
          <h2 id="queue-heading">Reading room</h2>
          <p>
            {readings.length} {readings.length === 1 ? 'reading' : 'readings'}
          </p>
        </div>
        <ReadingQueue readings={readings} />
      </section>
      <footer className={styles.footer}>
        <span>Enzo Simier</span>
        <Link href="/sources">Source archive</Link>
      </footer>
    </main>
  );
}
