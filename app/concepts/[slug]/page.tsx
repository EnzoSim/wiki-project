import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ConceptScene from '../../../components/concept-scene';
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
    keywords: [concept.category, ...concept.visualMotifs, ...concept.keywords.slice(0, 6)],
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

  const relatedConcepts = concept.related
    .map((relatedSlug) => getConceptBySlug(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const visualTags = concept.visualMotifs.slice(0, 4);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Back to index</Link>
      </nav>

      <section className={styles.hero}>
        <header className={styles.header}>
          <p className={styles.category}>{concept.category}</p>
          <h1>{concept.title}</h1>
          <p className={styles.lead}>{concept.summary}</p>
          <dl className={styles.heroMeta}>
            <div>
              <dt>Format</dt>
              <dd>Essay + sculpture</dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>{concept.slug}</dd>
            </div>
          </dl>
        </header>

        <ConceptScene className={styles.scene} concept={concept} />
      </section>

      <div className={styles.layout}>
        <article className={styles.article} aria-label="Entry text">
          <section className={styles.section}>
            <h2>Definition</h2>
            <p>{concept.definition}</p>
          </section>

          <section className={styles.section}>
            <h2>Why it matters</h2>
            <p>{concept.whyItMatters}</p>
          </section>

          <section className={styles.section}>
            <h2>Debate / limits</h2>
            <p>{concept.debate}</p>
          </section>

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

        <aside className={styles.sidebar} aria-label="Entry details">
          <section className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>Entry details</p>
            <dl className={styles.metaList}>
              <div>
                <dt>Category</dt>
                <dd>{concept.category}</dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{concept.title}</dd>
              </div>
              <div>
                <dt>Related</dt>
                <dd>{relatedConcepts.length}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>Visual cues</p>
            <ul className={styles.tagList}>
              {visualTags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </section>

          <section className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>Current note</p>
            <p className={styles.sidebarCopy}>
              The 3D scene above is procedurally rebuilt from this entry&apos;s text and motifs on
              each visit.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
