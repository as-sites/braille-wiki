import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { acceptInvite, verifyInviteToken } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [status, setStatus] = useState<"loading" | "invalid" | "ready" | "accepted" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setStatus("invalid");
        setStatusMessage("Missing invite token.");
        return;
      }

      try {
        const result = await verifyInviteToken(token);
        if (cancelled) return;

        if (result.valid) {
          setStatus("ready");
          setStatusMessage(result.emailMasked ? `Invite for ${result.emailMasked}` : "Invite is valid.");
          return;
        }

        setStatus("invalid");
        setStatusMessage(`This invite is ${result.status}.`);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setStatusMessage("Could not verify invite token.");
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!token || status !== "ready" || submitting) {
      return;
    }

    if (password.length < 12) {
      setStatusMessage("Password must be at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvite({
        token,
        password,
        name: name.trim() || undefined,
      });
      setStatus("accepted");
      setStatusMessage("Invite accepted. You can now sign in.");
    } catch {
      setStatus("error");
      setStatusMessage("Could not accept invite. The token may be invalid or expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">Accept Invite</h1>
        <p className="text-sm text-muted-foreground">{statusMessage || "Checking invite token..."}</p>

        {status === "loading" && (
          <div className="text-sm text-muted-foreground">Verifying token...</div>
        )}

        {status === "ready" && (
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Setting password..." : "Set password"}
            </Button>
          </form>
        )}

        {(status === "invalid" || status === "accepted" || status === "error") && (
          <div className="pt-2">
            <Link to="/login" className="text-sm underline text-primary">
              Go to login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
