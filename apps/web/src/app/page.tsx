
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <main style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Time Tracker SaaS</h1>
        <p style={{ marginBottom: '2rem', fontSize: '1.2rem' }}>
          Manage your time, projects, and reports efficiently.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login">
            <button>Login</button>
          </Link>
        </div>
      </main>
    </div>
  );
}
