import { serializeToHtml } from "@braille-docs/editor-schema";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { getDocument, publishDocument, type AdminDocument } from "../api/client";
import { useToaster } from "../components/shared/Toaster";

export function DocumentPreviewPage() {
  const { id = "" } = useParams();
  const { showToast } = useToaster();

  const [document, setDocument] = useState<AdminDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextDocument = await getDocument(id);
        if (!cancelled) {
          setDocument(nextDocument);
        }
      } catch {
        if (!cancelled) {
          showToast("Could not load document preview.", "error");
        }
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
  }, [id, showToast]);

  const html = useMemo(() => {
    if (!document?.prosemirrorJson) {
      return "<p>This draft has no content yet.</p>";
    }

    return serializeToHtml(document.prosemirrorJson as any);
  }, [document]);

  async function onPublish() {
    try {
      await publishDocument(id);
      showToast("Document published.", "success");
    } catch {
      showToast("Could not publish document.", "error");
    }
  }

  return (
    <div className="page-stack">
      <section className="card warning-box">
        <h1>Draft preview</h1>
        <p>This is a preview of the current draft. Publish to make it live.</p>
        <div className="inline-form">
          <Link to={`/documents/${id}/edit`}>Back to edit</Link>
          <button type="button" onClick={onPublish}>
            Publish now
          </button>
        </div>
      </section>

      <section className="card preview-content">
        {loading ? <p>Loading preview...</p> : null}
        <article dangerouslySetInnerHTML={{ __html: html }} />
      </section>
    </div>
  );
}
