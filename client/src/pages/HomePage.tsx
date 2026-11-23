import { useEffect, useState } from 'react';

interface HealthData {
  status: string;
  database: string;
  timestamp?: string;
  error?: string;
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/health');
        if (!res.ok) {
          throw new Error(`Server responded with HTTP ${res.status}`);
        }

        const data: HealthData = await res.json();
        if (isMounted) {
          setHealth(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to reach API server');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Reddit Clone</h1>
      <p>Decoupled React (Vite) + Express monorepo architecture.</p>

      <section style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
        <h2>Backend Status (/api/health)</h2>
        {loading && <p>Checking backend connectivity...</p>}
        {error && (
          <p style={{ color: '#dc2626' }}>
            <strong>Backend Error:</strong> {error}
          </p>
        )}
        {health && (
          <div>
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Database:</strong> {health.database}</p>
            {health.timestamp && <p><strong>Server Time:</strong> {new Date(health.timestamp).toLocaleString()}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
