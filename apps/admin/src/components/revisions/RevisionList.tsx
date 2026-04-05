import type { AdminRevision } from "../../api/client";

type RevisionListProps = {
  revisions: AdminRevision[];
  selectedRevisionId: string | null;
  onSelect: (revisionId: string) => void;
};

function actionLabel(action: AdminRevision["action"]) {
  if (action === "publish") {
    return "Published";
  }

  if (action === "rollback") {
    return "Rolled back";
  }

  return "Saved";
}

export function RevisionList({ revisions, selectedRevisionId, onSelect }: RevisionListProps) {
  return (
    <div className="card">
      <h2>Revision history</h2>

      <ul className="revision-list">
        {revisions.map((revision) => (
          <li key={revision.id}>
            <button
              type="button"
              className={selectedRevisionId === revision.id ? "is-active" : ""}
              onClick={() => {
                onSelect(revision.id);
              }}
            >
              <strong>{actionLabel(revision.action)}</strong>
              <span>{new Date(revision.createdAt).toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
