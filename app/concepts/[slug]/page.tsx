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
      <article className={styles.article}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            Back to index
          </Link>
          <p className={styles.kicker}>{concept.category}</p>
          <h1>{concept.title}</h1>
          <p className={styles.summary}>{concept.summary}</p>
        </header>

        <section className={styles.note}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>Entry</p>
            <h2>Current definition</h2>
          </div>
          <p className={styles.bodyCopy}>{concept.summary}</p>
          <dl className={styles.definitionList}>
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
              <dd className={styles.keywordList}>
                {concept.keywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.note}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>Source</p>
            <h2>Seeded from the archive.</h2>
          </div>
          <p className={styles.bodyCopy}>{concept.source}</p>
        </section>

        {otherConcepts.length > 0 ? (
          <nav className={styles.more} aria-labelledby="continue-heading">
            <div className={styles.sectionHeading}>
              <p className={styles.sectionLabel}>See also</p>
              <h2 id="continue-heading">Other terms in the archive.</h2>
            </div>
            <div className={styles.linkStack}>
              {otherConcepts.map((item) => (
                <Link key={item.slug} href={`/concepts/${item.slug}`} className={styles.relatedLink}>
                  <div className={styles.relatedTopline}>
                    <strong>{item.title}</strong>
                    <span>{item.category}</span>
                  </div>
                  <p>{item.summary}</p>
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </article>
    </main>
  );
}
