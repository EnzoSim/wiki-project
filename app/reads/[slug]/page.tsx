import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { getReadingBySlug, groupReadingsByTheme, loadReadingQueue } from '../../../lib/wiki';

type ReadPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ReadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getReadingBySlug(slug);

  if (!entry) {
    return { title: 'Reading not found' };
  }

  return {
    title: `${entry.title} | Reading queue`,
    description: entry.summary,
    keywords: [entry.theme, ...entry.subthemes, ...entry.keywords],
    openGraph: {
      title: `${entry.title} | Wiki Master`,
      description: entry.summary,
      type: 'article',
    },
  };
}

export default async function ReadPage({ params }: ReadPageProps) {
  const { slug } = await params;
  const entry = await getReadingBySlug(slug);

  if (!entry) return notFound();

  const related = groupReadingsByTheme(await loadReadingQueue('all'))
    .flatMap((theme) => theme.items)
    .filter((item) => item.slug !== entry.slug)
    .filter((item) => item.theme === entry.theme || item.subthemes.some((subtheme) => entry.subthemes.includes(subtheme)))
    .slice(0, 4);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Back to index</Link>
      </nav>

      <header className={styles.header}>
        <p className={styles.category}>To read</p>
        <h1>{entry.title}</h1>
        <p className={styles.lead}>{entry.summary}</p>
        <p className={styles.credit}>Classified for Enzo Simier.</p>
      </header>

      <div className={styles.layout}>
        <article className={styles.article}>
          {entry.whyItMatters ? (
            <section className={styles.section}>
              <h2>Why it was queued</h2>
              <p>{entry.whyItMatters}</p>
            </section>
          ) : null}

          {entry.notes ? (
            <section className={styles.section}>
              <h2>Classifier notes</h2>
              <p>{entry.notes}</p>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section className={styles.section}>
              <h2>Nearby reads</h2>
              <ul className={styles.relatedList}>
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/reads/${item.slug}`}>{item.title}</Link>
                    <span>{item.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>

        <aside className={styles.infobox} aria-label="Entry details">
          <h2>At a glance</h2>
          <dl className={styles.metaList}>
            <div>
              <dt>Theme</dt>
              <dd>{entry.theme}</dd>
            </div>
            {entry.subthemes.length > 0 ? (
              <div>
                <dt>Subthemes</dt>
                <dd>{entry.subthemes.join(', ')}</dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>{entry.status}</dd>
            </div>
            {entry.source?.type ? (
              <div>
                <dt>Source type</dt>
                <dd>{entry.source.type.replace(/-/g, ' ')}</dd>
              </div>
            ) : null}
            {entry.source?.url ? (
              <div>
                <dt>Source</dt>
                <dd>
                  <a href={entry.source.url} target="_blank" rel="noreferrer">
                    {entry.source.label ?? entry.source.url}
                  </a>
                </dd>
              </div>
            ) : null}
            {entry.addedVia ? (
              <div>
                <dt>Added via</dt>
                <dd>{entry.addedVia}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </main>
  );
}
