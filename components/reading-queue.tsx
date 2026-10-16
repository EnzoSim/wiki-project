import Link from 'next/link';
import styles from './reading-queue.module.css';
import type { ReadingEntry } from '../lib/wiki';

export default function ReadingQueue({ readings }: { readings: ReadingEntry[] }) {
  if (!readings.length) return <p className={styles.empty}>No readings yet.</p>;
  return (
    <div className={styles.queue}>
      {readings.map((entry) => (
        <article key={entry.slug} className={styles.item}>
          <div>
            <span className={styles.meta}>
              {entry.theme} · {entry.source?.type || 'Reading'}
            </span>
            <h3>
              <Link href={`/reads/${entry.slug}`}>{entry.title}</Link>
            </h3>
            <p>{entry.summary}</p>
          </div>
          {entry.pdfUrl ? (
            <a className={styles.pdf} href={entry.pdfUrl}>
              Original PDF ↗
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
