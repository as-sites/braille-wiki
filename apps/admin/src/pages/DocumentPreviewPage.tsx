import { serializeToHtml } from "@braille-wiki/editor-schema";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { getDocument, publishDocument, type AdminDocument } from "../api/client";
import { useToaster } from "../components/shared/Toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
        if (!cancelled) setDocument(nextDocument);
      } catch {
        if (!cancelled) showToast("Could not load document preview.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, showToast]);

  const html = useMemo(() => {
    if (!document?.prosemirrorJson) return "<p>This draft has no content yet.</p>";
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
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Draft preview</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>This is a preview of the current draft. Publish to make it live.</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/documents/${id}/edit`}>Back to edit</Link>
            </Button>
            <Button size="sm" onClick={onPublish}>
              Publish now
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <article
              className="prose prose-stone max-w-3xl"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
