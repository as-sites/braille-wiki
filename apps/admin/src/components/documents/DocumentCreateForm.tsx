import { useMemo, useState, type FormEvent } from "react";

type ParentOption = {
  path: string;
  title: string;
};

type DocumentCreateFormProps = {
  parents: ParentOption[];
  onSubmit: (payload: { title: string; parentPath: string; slug: string }) => Promise<void>;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function DocumentCreateForm({ parents, onSubmit }: DocumentCreateFormProps) {
  const [title, setTitle] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => title.trim().length > 0 && slug.trim().length > 0, [slug, title]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        parentPath,
        slug: slug.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form-stack" onSubmit={submit}>
      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);

            if (!slugTouched) {
              setSlug(slugify(next));
            }
          }}
          required
        />
      </label>

      <label>
        Parent document
        <select
          value={parentPath}
          onChange={(event) => {
            setParentPath(event.target.value);
          }}
        >
          <option value="">Top level</option>
          {parents.map((parent) => (
            <option key={parent.path} value={parent.path}>
              {parent.title} ({parent.path})
            </option>
          ))}
        </select>
      </label>

      <label>
        Slug
        <input
          type="text"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
          required
        />
      </label>

      <button type="submit" disabled={!canSubmit || saving}>
        {saving ? "Creating..." : "Create document"}
      </button>
    </form>
  );
}
