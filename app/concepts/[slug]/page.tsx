import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { getConceptBySlug, loadWikiConcepts, type Concept } from '../../../lib/wiki';
import NotionContent from '../../../components/notion-content';

type ConceptPageProps = {
  params: Promise<{ slug: string }>;
};

const SEE_ALSO_LIMIT = 8;

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ConceptPageProps): Promise<Metadata> {
  const { slug } = await params;
  const concept = await getConceptBySlug(slug);

  if (!concept) {
    return {
      title: 'Concept not found',
    };
  }

  return {
    title: concept.title,
    description: concept.summary,
    keywords: [concept.category, ...concept.keywords],
    openGraph: {
      title: `${concept.title} | Reference index`,
      description: concept.summary,
      type: 'article',
    },
  };
}

export default async function ConceptPage({ params }: ConceptPageProps) {
  const { slug } = await params;
  const concept = await getConceptBySlug(slug);

  if (!concept) return notFound();

  const conceptsBySlug = new Map((await loadWikiConcepts()).map((item) => [item.slug, item]));
  const relatedConcepts = concept.related
    .slice(0, SEE_ALSO_LIMIT)
    .map((relatedSlug) => conceptsBySlug.get(relatedSlug))
    .filter((item): item is Concept => Boolean(item));

  return (
    <main id="main" className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Back to index</Link>
      </nav>

      <header className={styles.header}>
        <p className={styles.category}>{concept.category}</p>
        <h1>{concept.title}</h1>
        {!concept.body?.length ? <p className={styles.lead}>{concept.summary}</p> : null}
        <p className={styles.credit}>Curated by Enzo Simier.</p>
      </header>

      <div className={styles.layout}>
        <article className={styles.article}>
          {concept.body?.length ? (
            <NotionContent nodes={concept.body} />
          ) : (
            <>
              {concept.whyItMatters ? (
                <section className={styles.section}>
                  <h2>Why it matters</h2>
                  <p>{concept.whyItMatters}</p>
                </section>
              ) : null}

              {concept.notes ? (
                <section className={styles.section}>
                  <h2>Notes</h2>
                  <p>{concept.notes}</p>
                </section>
              ) : null}
            </>
          )}

          {relatedConcepts.length > 0 ? (
            <section className={styles.section}>
              <h2>See also</h2>
              <ul className={styles.relatedList}>
                {relatedConcepts.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/concepts/${item.slug}`}>{item.title}</Link>
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
              <dt>Category</dt>
              <dd>{concept.category}</dd>
            </div>
            <div>
              <dt>Keywords</dt>
              <dd>{concept.keywords.join(', ')}</dd>
            </div>
            {concept.subthemes.length > 0 ? (
              <div>
                <dt>Subthemes</dt>
                <dd>{concept.subthemes.join(', ')}</dd>
              </div>
            ) : null}
            {concept.source?.label || concept.source?.url ? (
              <div>
                <dt>Source</dt>
                <dd>
                  {concept.source.url ? (
                    <a href={concept.source.url}>{concept.source.label || concept.source.url}</a>
                  ) : (
                    concept.source.label
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </main>
  );
}
