import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.kicker}>Not found</p>
      <h1>This entry is not in the current index.</h1>
      <p className={styles.copy}>
        Return to the index to browse the terms currently published on the site.
      </p>
      <Link className={styles.link} href="/">
        Back to index
      </Link>
    </main>
  );
}
