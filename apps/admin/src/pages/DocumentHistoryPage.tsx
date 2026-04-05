import { useEffect, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { useNavigate, useParams } from "react-router";

import { getRevision, listRevisions, rollbackDocument, type AdminRevision } from "../api/client";
import { RevisionList } from "../components/revisions/RevisionList";
import { RevisionViewer } from "../components/revisions/RevisionViewer";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { useToaster } from "../components/shared/Toaster";

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function DocumentHistoryPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { showToast } = useToaster();

  const [revisions, setRevisions] = useState<AdminRevision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<JSONContent>(EMPTY_DOC);
  const [loading, setLoading] = useState(true);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const revisionResponse = await listRevisions(id, { limit: 60 });

        if (cancelled) {
          return;
        }

        setRevisions(revisionResponse.items);

        const first = revisionResponse.items[0];
        if (first) {
          setSelectedRevisionId(first.id);
        }
      } catch {
        if (!cancelled) {
          showToast("Could not load revision history.", "error");
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

  useEffect(() => {
    let cancelled = false;

    async function loadRevision() {
      if (!selectedRevisionId) {
        return;
      }

      try {
        const revision = await getRevision(selectedRevisionId);
        if (!cancelled) {
          setSelectedContent((revision.prosemirrorJson as JSONContent) ?? EMPTY_DOC);
        }
      } catch {
        if (!cancelled) {
          showToast("Could not load revision content.", "error");
        }
      }
    }

    void loadRevision();

    return () => {
      cancelled = true;
    };
  }, [selectedRevisionId, showToast]);

  const selectedRevision = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [revisions, selectedRevisionId],
  );

  async function onConfirmRollback() {
    if (!selectedRevisionId) {
      return;
    }

    try {
      await rollbackDocument(id, selectedRevisionId);
      showToast("Revision restored as the current draft.", "success");
      navigate(`/documents/${id}/edit`);
    } catch {
      showToast("Could not rollback to that revision.", "error");
    }
  }

  return (
    <div className="page-stack">
      <section className="card history-toolbar">
        <h1>Revision History</h1>
        <button type="button" disabled={!selectedRevision} onClick={() => setShowRollbackConfirm(true)}>
          Roll back to selected revision
        </button>
      </section>

      {loading ? <p>Loading revisions...</p> : null}

      <div className="history-grid">
        <RevisionList
          revisions={revisions}
          selectedRevisionId={selectedRevisionId}
          onSelect={(revisionId) => {
            setSelectedRevisionId(revisionId);
          }}
        />

        <RevisionViewer content={selectedContent} />
      </div>

      <ConfirmDialog
        open={showRollbackConfirm}
        title="Restore this revision"
        message="This will copy this revision into your draft. It will not publish automatically."
        confirmLabel="Restore revision"
        onConfirm={() => {
          void onConfirmRollback();
        }}
        onCancel={() => {
          setShowRollbackConfirm(false);
        }}
      />
    </div>
  );
}
