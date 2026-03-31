import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Not found</p>
      <h1>This term is not part of the current index.</h1>
      <p className={styles.copy}>
        Only three entries are live right now. Head back to the homepage to browse them directly.
      </p>
      <Link className={styles.action} href="/">
        Back to the index
      </Link>
    </main>
  );
}
