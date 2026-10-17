import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadPublicLibrary } from '../../lib/notion';
import styles from '../concepts/[slug]/page.module.css';
export const metadata = { title: 'Archive' };
export const dynamic = 'force-dynamic';
export default async function SourcesPage() {
  if (!(await loadPublicLibrary()).available) notFound();
  return (
    <main id="main" className={styles.page}>
      <nav className={styles.breadcrumbs}>
        <Link href="/">Back to index</Link>
      </nav>
      <header className={styles.header}>
        <h1>Archive</h1>
        <p className={styles.lead}>Original records and documents behind this personal library.</p>
      </header>
      <article className={`${styles.article} ${styles.sourceArticle}`}>
        <section className={styles.section}>
          <h2>Preserved originals</h2>
          <p>
            The migration brought together 36 source records into 21 distinct concepts, alongside
            one reading. Every original record is preserved, including duplicates and earlier
            versions.
          </p>
          <ul>
            <li>
              <a href="/source-archive.zip">Download the original source archive</a>
            </li>
            <li>
              <a href="/source-records.json">View the preserved records</a>
            </li>
            <li>
              <a href="/pdfs/complete-biosynthesis-of-nicotine.pdf">
                Open the original reading PDF
              </a>
            </li>
          </ul>
        </section>
        <section className={styles.section}>
          <h2>Illustrations</h2>
          <p>
            The concept illustrations were generated with Image Gen and finished in Paper with its
            native FlutedGlass shader. The originals and final compositions are preserved with the
            library.
          </p>
        </section>
      </article>
    </main>
  );
}
