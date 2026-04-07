import Link from 'next/link';
import styles from './reading-queue.module.css';
import type { ReadingEntry, ReadingThemeOverview } from '../lib/wiki';

type ReadingQueueProps = {
  readings: ReadingEntry[];
  themes: ReadingThemeOverview[];
};

function buildSourceLabel(entry: ReadingEntry) {
  const typeLabel = entry.source?.type ? entry.source.type.replace(/-/g, ' ') : 'submission';
  const viaLabel = entry.addedVia ? `via ${entry.addedVia}` : null;
  return [typeLabel, viaLabel].filter(Boolean).join(' · ');
}

export default function ReadingQueue({ readings, themes }: ReadingQueueProps) {
  if (readings.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No reading leads are queued yet.</h3>
        <p>
          New links or notes sent through the ingestion workflow will land here and be
          grouped automatically by theme and subtheme.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.queue}>
      {themes.map((theme) => (
        <section key={theme.theme} className={styles.themeBlock} aria-labelledby={`theme-${theme.theme}`}>
          <div className={styles.themeHeader}>
            <div>
              <p className={styles.themeLabel}>Theme</p>
              <h3 id={`theme-${theme.theme}`}>{theme.theme}</h3>
            </div>
            <p className={styles.themeMeta}>{theme.count} queued</p>
          </div>

          {theme.subthemes.length > 0 ? (
            <ul className={styles.subthemes} aria-label={`${theme.theme} subthemes`}>
              {theme.subthemes.map((entry) => (
                <li key={entry.subtheme}>
                  <span>{entry.subtheme}</span>
                  <strong>{entry.count}</strong>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={styles.readingList}>
            {theme.items.map((entry) => (
              <article key={entry.slug} className={styles.item}>
                <div className={styles.itemHeader}>
                  <div>
                    <Link className={styles.itemTitle} href={`/reads/${entry.slug}`}>
                      {entry.title}
                    </Link>
                    <p className={styles.itemMeta}>{buildSourceLabel(entry)}</p>
                  </div>
                  {entry.source?.url || entry.pdfUrl ? (
                    <div style={{ display: 'grid', gap: '0.35rem', justifyItems: 'end' }}>
                      {entry.source?.url ? (
                        <a className={styles.sourceLink} href={entry.source.url} target="_blank" rel="noreferrer">
                          Source
                        </a>
                      ) : null}
                      {entry.pdfUrl ? (
                        <a className={styles.sourceLink} href={entry.pdfUrl} target="_blank" rel="noreferrer">
                          PDF
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className={styles.itemSummary}>{entry.summary}</p>
                {entry.whyItMatters ? <p className={styles.itemWhy}>{entry.whyItMatters}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
