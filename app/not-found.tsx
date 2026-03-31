import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Not found</p>
      <h1>This concept is not in the current archive.</h1>
      <p className={styles.copy}>
        Head back to the main index to browse the seeded concepts and reopen the active graph.
      </p>
      <Link className={styles.action} href="/">
        Return to the wiki
      </Link>
    </main>
  );
}
