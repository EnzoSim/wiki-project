import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { getConceptBySlug, loadWikiConcepts } from '../../../lib/wiki';

type ConceptPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return loadWikiConcepts().map((concept) => ({ slug: concept.slug }));
}

export async function generateMetadata({ params }: ConceptPageProps): Promise<Metadata> {
  const { slug } = await params;
  const concept = getConceptBySlug(slug);

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
      title: `${concept.title} | Wiki Master`,
      description: concept.summary,
      type: 'article',
    },
  };
}

export default async function ConceptPage({ params }: ConceptPageProps) {
  const { slug } = await params;
  const concept = getConceptBySlug(slug);

  if (!concept) return notFound();

  const otherConcepts = loadWikiConcepts()
    .filter((item) => item.slug !== concept.slug)
    .sort((left, right) => left.title.localeCompare(right.title));

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Back to index</Link>
      </nav>

      <header className={styles.header}>
        <p className={styles.category}>{concept.category}</p>
        <h1>{concept.title}</h1>
        <p className={styles.lead}>{concept.summary}</p>
        <p className={styles.credit}>Curated by Enzo Simier.</p>
      </header>

      <div className={styles.layout}>
        <article className={styles.article}>
          {otherConcepts.length > 0 ? (
            <section className={styles.section}>
              <h2>See also</h2>
              <ul className={styles.relatedList}>
                {otherConcepts.map((item) => (
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
              <dt>Slug</dt>
              <dd>{concept.slug}</dd>
            </div>
            <div>
              <dt>Keywords</dt>
              <dd>{concept.keywords.join(', ')}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
