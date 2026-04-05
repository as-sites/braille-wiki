import { useEffect, useState } from "react";
import { Link } from "react-router";

import { listDocuments, type AdminDocumentSummary } from "../api/client";
import { StatusBadge } from "../components/documents/StatusBadge";

function relativeTime(value: string) {
  const now = Date.now();
  const target = new Date(value).getTime();

  if (Number.isNaN(target)) {
    return "Unknown";
  }

  const minutes = Math.max(1, Math.floor((now - target) / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function DashboardPage() {
  const [recentlyEdited, setRecentlyEdited] = useState<AdminDocumentSummary[]>([]);
  const [recentPublishes, setRecentPublishes] = useState<AdminDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [edited, published] = await Promise.all([
          listDocuments({ limit: 10 }),
          listDocuments({ status: "published", limit: 10 }),
        ]);

        if (cancelled) {
          return;
        }

        setRecentlyEdited(edited.items);
        setRecentPublishes(published.items);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="card">
        <h1>Dashboard</h1>
        <p>Welcome back. Pick up where you left off.</p>
        <div className="quick-links">
          <Link to="/documents/new">Create document</Link>
          <Link to="/documents">Browse documents</Link>
          <Link to="/settings">Open settings</Link>
        </div>
      </section>

      <section className="card">
        <h2>Recently edited</h2>
        {loading ? <p>Loading...</p> : null}
        <ul className="simple-list">
          {recentlyEdited.map((doc) => (
            <li key={doc.id}>
              <Link to={`/documents/${doc.id}/edit`}>{doc.title}</Link>
              <StatusBadge status={doc.status} />
              <small>{relativeTime(doc.updatedAt)}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Recent publishes</h2>
        {loading ? <p>Loading...</p> : null}
        <ul className="simple-list">
          {recentPublishes.map((doc) => (
            <li key={doc.id}>
              <Link to={`/documents/${doc.id}/preview`}>{doc.title}</Link>
              <small>{doc.publishedAt ? relativeTime(doc.publishedAt) : "Not published"}</small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
