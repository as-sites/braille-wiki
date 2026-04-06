import { useEffect, useState } from "react";

import {
  createUserInvite,
  deleteUser,
  listUserInvites,
  listUsers,
  resendUserInvite,
  revokeUserInvite,
  updateUser,
  type AdminUser,
  type AdminUserInvite,
} from "../../api/client";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { useToaster } from "../shared/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserManagerProps = {
  currentUserId: string;
};

export function UserManager({ currentUserId }: UserManagerProps) {
  const { showToast } = useToaster();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<AdminUserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [nextUsers, nextInvites] = await Promise.all([
        listUsers(),
        listUserInvites(),
      ]);
      setUsers(nextUsers);
      setInvites(nextInvites);
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
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    try {
      await createUserInvite({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      showToast("Invite sent.", "success");
      setInviteName("");
      setInviteEmail("");
      setInviteRole("editor");
      await refresh();
    } catch {
      showToast("Could not send invite.", "error");
    }
  }

  async function resendInvite(id: string) {
    try {
      await resendUserInvite(id);
      showToast("Invite resent.", "success");
      await refresh();
    } catch {
      showToast("Could not resend invite.", "error");
    }
  }

  async function revokeInvite(id: string) {
    try {
      await revokeUserInvite(id);
      showToast("Invite revoked.", "success");
      await refresh();
    } catch {
      showToast("Could not revoke invite.", "error");
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
    if (!deleteId) return;

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
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Users</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder="Name"
          value={inviteName}
          onChange={(e) => setInviteName(e.target.value)}
          className="w-40"
        />
        <Input
          type="email"
          placeholder="Email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="w-56"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as "admin" | "editor")}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <Button onClick={inviteUser}>Send invite</Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Users</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <select
                        value={user.role}
                        onChange={(e) => void changeRole(user.id, e.target.value as "admin" | "editor")}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteId(user.id)}
                        disabled={user.id === currentUserId}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Invites</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No invites yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell className="capitalize">{invite.role}</TableCell>
                      <TableCell>
                        <Badge variant={invite.status === "pending" ? "default" : "secondary"}>
                          {invite.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(invite.expiresAt).toLocaleString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void resendInvite(invite.id)}
                          disabled={invite.status !== "pending"}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void revokeInvite(invite.id)}
                          disabled={invite.status !== "pending"}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete user"
        message="This person will lose access to the admin workspace."
        confirmLabel="Delete user"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
