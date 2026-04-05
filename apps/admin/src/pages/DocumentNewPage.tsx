import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { createDocument, listDocuments, type AdminDocumentSummary } from "../api/client";
import { DocumentCreateForm } from "../components/documents/DocumentCreateForm";
import { useToaster } from "../components/shared/Toaster";

export function DocumentNewPage() {
  const navigate = useNavigate();
  const { showToast } = useToaster();

  const [documents, setDocuments] = useState<AdminDocumentSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listDocuments({ limit: 300 });
        if (!cancelled) {
          setDocuments(result.items);
        }
      } catch {
        if (!cancelled) {
          showToast("Could not load parent documents.", "error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  return (
    <div className="page-stack">
      <section className="card">
        <h1>Create Document</h1>
        <p>Fill in the title, choose where it belongs, and adjust the URL slug if needed.</p>
      </section>

      <DocumentCreateForm
        parents={documents.map((document) => ({ path: document.path, title: document.title }))}
        onSubmit={async (payload) => {
          try {
            const created = await createDocument(payload);
            showToast("Document created.", "success");
            navigate(`/documents/${created.id}/edit`);
          } catch {
            showToast("Could not create document.", "error");
          }
        }}
      />
    </div>
  );
}
