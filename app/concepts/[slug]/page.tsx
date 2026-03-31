import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { buildConceptImageSvg, buildConceptPrompt, getConceptBySlug, loadWikiConcepts } from '../../../lib/wiki';

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
  const allConcepts = loadWikiConcepts();
  const relatedConcepts = allConcepts
    .filter((item) => concept.related.includes(item.slug))
    .slice(0, 6);
  const sameCategory = allConcepts.filter(
    (item) => item.category === concept.category && item.slug !== concept.slug,
  );
  const imageSrc = buildConceptImageSvg(concept);
  const prompt = buildConceptPrompt(concept);
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          Back to wiki
        </Link>
        <p className={styles.kicker}>{concept.category}</p>
        <h1>{concept.title}</h1>
        <p className={styles.summary}>{concept.summary}</p>
      </div>

      <div className={styles.layout}>
        <section className={styles.mainColumn}>
          <div className={styles.heroImage}>
            <img src={imageSrc} alt={concept.title} />
          </div>

          <section className={styles.storyBlock}>
            <div className={styles.sectionHeading}>
              <p>Why it matters</p>
              <h2>The concept, framed for fast scanning.</h2>
            </div>
            <p>{concept.summary}</p>
            <ul className={styles.signalList}>
              {concept.keywords.slice(0, 4).map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          </section>

          <section className={styles.storyBlock}>
            <div className={styles.sectionHeading}>
              <p>Prompt trace</p>
              <h2>How the editorial visual is derived.</h2>
            </div>
            <p className={styles.prompt}>{prompt}</p>
          </section>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.infoBlock}>
            <div className={styles.sectionHeading}>
              <p>Metadata</p>
              <h2>Seed attributes</h2>
            </div>
            <dl className={styles.definitionList}>
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
              <div>
                <dt>Seed text</dt>
                <dd>{concept.source}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.infoBlock}>
            <div className={styles.sectionHeading}>
              <p>Related reading</p>
              <h2>Follow the concept graph.</h2>
            </div>
            <div className={styles.linkStack}>
              {relatedConcepts.length > 0 ? (
                relatedConcepts.map((item) => (
                  <Link key={item.slug} href={`/concepts/${item.slug}`} className={styles.relatedLink}>
                    <strong>{item.title}</strong>
                    <span>{item.category}</span>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyCopy}>
                  Add more connected concepts to the markdown seed to deepen the graph.
                </p>
              )}
            </div>
          </section>

          <section className={styles.infoBlock}>
            <div className={styles.sectionHeading}>
              <p>Same category</p>
              <h2>Continue browsing</h2>
            </div>
            <div className={styles.linkStack}>
              {sameCategory.length > 0 ? (
                sameCategory.slice(0, 4).map((item) => (
                  <Link key={item.slug} href={`/concepts/${item.slug}`} className={styles.relatedLink}>
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyCopy}>
                  This category only has one concept so far.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
