import { useEffect, useState } from "react";

import { createUser, deleteUser, listUsers, updateUser, type AdminUser } from "../../api/client";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { useToaster } from "../shared/Toaster";

type UserManagerProps = {
  currentUserId: string;
};

export function UserManager({ currentUserId }: UserManagerProps) {
  const { showToast } = useToaster();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const nextUsers = await listUsers();
      setUsers(nextUsers);
    } catch {
      showToast("Could not load users.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function inviteUser() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      return;
    }

    try {
      await createUser({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      showToast("User invited.", "success");
      setInviteName("");
      setInviteEmail("");
      setInviteRole("editor");
      await refresh();
    } catch {
      showToast("Could not invite user.", "error");
    }
  }

  async function changeRole(id: string, role: "admin" | "editor") {
    try {
      await updateUser(id, { role });
      showToast("Role updated.", "success");
      await refresh();
    } catch {
      showToast("Could not update role.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) {
      return;
    }

    try {
      await deleteUser(deleteId);
      showToast("User deleted.", "success");
      setDeleteId(null);
      await refresh();
    } catch {
      showToast("Could not delete user.", "error");
    }
  }

  return (
    <section className="card form-stack">
      <h2>Users</h2>

      <div className="inline-form inline-form--wrap">
        <input
          type="text"
          placeholder="Name"
          value={inviteName}
          onChange={(event) => {
            setInviteName(event.target.value);
          }}
        />
        <input
          type="email"
          placeholder="Email"
          value={inviteEmail}
          onChange={(event) => {
            setInviteEmail(event.target.value);
          }}
        />
        <select
          value={inviteRole}
          onChange={(event) => {
            setInviteRole(event.target.value as "admin" | "editor");
          }}
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="button" onClick={inviteUser}>
          Invite user
        </button>
      </div>

      {loading ? <p>Loading users...</p> : null}

      <table className="simple-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(event) => {
                    void changeRole(user.id, event.target.value as "admin" | "editor");
                  }}
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteId(user.id);
                  }}
                  disabled={user.id === currentUserId}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete user"
        message="This person will lose access to the admin workspace."
        confirmLabel="Delete user"
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={() => {
          setDeleteId(null);
        }}
      />
    </section>
  );
}
