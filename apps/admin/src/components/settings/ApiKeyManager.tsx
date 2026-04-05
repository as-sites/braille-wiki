import { useEffect, useState } from "react";

import { createApiKey, listApiKeys, revokeApiKey, type AdminApiKey } from "../../api/client";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { useToaster } from "../shared/Toaster";

export function ApiKeyManager() {
  const { showToast } = useToaster();

  const [keys, setKeys] = useState<AdminApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const nextKeys = await listApiKeys();
      setKeys(nextKeys);
    } catch {
      showToast("Could not load API keys.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function generate() {
    if (!newName.trim()) {
      return;
    }

    try {
      const created = await createApiKey(newName.trim());
      setRawKey(created.key);
      setNewName("");
      showToast("API key created.", "success");
      await refresh();
    } catch {
      showToast("Could not create API key.", "error");
    }
  }

  async function confirmRevoke() {
    if (!revokeId) {
      return;
    }

    try {
      await revokeApiKey(revokeId);
      showToast("API key revoked.", "success");
      setRevokeId(null);
      await refresh();
    } catch {
      showToast("Could not revoke API key.", "error");
    }
  }

  return (
    <section className="card form-stack">
      <h2>API keys</h2>
      <p>Create keys for tools that need access to your documents.</p>

      <div className="inline-form">
        <input
          type="text"
          placeholder="Key name"
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
          }}
        />
        <button type="button" onClick={generate}>
          Generate new key
        </button>
      </div>

      {rawKey ? (
        <div className="warning-box">
          <p>Copy this key now. You will not be able to view it again.</p>
          <code>{rawKey}</code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(rawKey);
              showToast("Key copied.", "success");
            }}
          >
            Copy key
          </button>
        </div>
      ) : null}

      {loading ? <p>Loading keys...</p> : null}

      <table className="simple-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Last used</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id}>
              <td>{key.name}</td>
              <td>{new Date(key.createdAt).toLocaleDateString()}</td>
              <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setRevokeId(key.id);
                  }}
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke API key"
        message="This key will stop working immediately."
        confirmLabel="Revoke key"
        onConfirm={() => {
          void confirmRevoke();
        }}
        onCancel={() => {
          setRevokeId(null);
        }}
      />
    </section>
  );
}
