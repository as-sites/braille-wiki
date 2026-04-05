import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import type { JSONContent } from "@tiptap/react";

import {
  getDocument,
  publishDocument,
  saveDocument,
  type AdminDocument,
} from "../api/client";
import { Editor } from "../components/editor/Editor";

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

function formatTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function safeParseMetadata(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

function getEditorDoc(document: AdminDocument | null, editorJson: JSONContent): JSONContent {
  if (!document) {
    return editorJson;
  }

  const source = document.prosemirrorJson as JSONContent | null;
  return source && source.type ? source : EMPTY_DOC;
}

export function DocumentEditPage() {
  const { id = "" } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<AdminDocument | null>(null);
  const [editorJson, setEditorJson] = useState<JSONContent>(EMPTY_DOC);
  const [dirty, setDirty] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metadataText, setMetadataText] = useState("{}");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setLoading(false);
        setError("Missing document ID in route params");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextDocument = await getDocument(id);
        if (cancelled) {
          return;
        }

        setDocument(nextDocument);
        setEditorJson((nextDocument.prosemirrorJson as JSONContent | null) ?? EMPTY_DOC);
        setTitle(nextDocument.title);
        setDescription(nextDocument.description ?? "");
        setMetadataText(JSON.stringify(nextDocument.metadata ?? {}, null, 2));
        setLastSaveTime(nextDocument.updatedAt);
        setDirty(false);
      } catch {
        if (!cancelled) {
          setError("Unable to load the document.");
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
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  const editorContent = useMemo(() => getEditorDoc(document, editorJson), [document, editorJson]);

  async function onSave() {
    if (!id) {
      return;
    }

    try {
      const metadata = safeParseMetadata(metadataText);

      const updated = await saveDocument(id, {
        title: title.trim() || undefined,
        description: description.trim() || null,
        metadata,
        prosemirrorJson: editorJson as Record<string, unknown>,
      });

      setDocument(updated);
      setLastSaveTime(updated.updatedAt);
      setDirty(false);
      setError(null);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save document";
      setError(message);
    }
  }

  async function onPublish() {
    if (!id) {
      return;
    }

    try {
      const updated = await publishDocument(id);
      setDocument(updated);
      setError(null);
    } catch {
      setError("Publish endpoint is not fully implemented yet (planned for step 08).");
    }
  }

  if (loading) {
    return <p>Loading document...</p>;
  }

  if (error && !document) {
    return <p>{error}</p>;
  }

  return (
    <div className="editor-page">
      <header className="editor-page__header">
        <div>
          <h1>Edit Document</h1>
          <p>{document?.path}</p>
        </div>

        <div className="editor-page__actions">
          <button type="button" onClick={onSave}>
            Save
          </button>
          <button type="button" onClick={onPublish}>
            Publish
          </button>
        </div>
      </header>

      <section className="editor-page__status">
        <span>Status: {document?.status ?? "draft"}</span>
        <span>Last save: {formatTime(lastSaveTime)}</span>
        <span>Last publish: {formatTime(document?.publishedAt ?? null)}</span>
        {dirty ? <span className="status-dirty">Unsaved changes</span> : null}
      </section>

      {error ? <p className="status-error">{error}</p> : null}

      <div className="editor-page__body">
        <section className="editor-page__editor">
          <Editor
            initialContent={editorContent}
            onUpdate={(nextJson) => {
              setEditorJson(nextJson);
              setDirty(true);
            }}
          />
        </section>

        <aside className="editor-page__meta">
          <h2>Metadata</h2>

          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setDirty(true);
              }}
            />
          </label>

          <label>
            Metadata JSON
            <textarea
              value={metadataText}
              onChange={(event) => {
                setMetadataText(event.target.value);
                setDirty(true);
              }}
              rows={12}
            />
          </label>
        </aside>
      </div>
    </div>
  );
}
