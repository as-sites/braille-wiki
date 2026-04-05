import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onSuccess: () => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe: true,
        }),
      });

      if (!response.ok) {
        setError("We could not sign you in with those details.");
        return;
      }

      onSuccess();
    } catch {
      setError("Sign in is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <label>
        Email
        <input
          autoComplete="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          required
        />
      </label>

      <label>
        Password
        <input
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          required
        />
      </label>

      {error ? <p className="status-error">{error}</p> : null}

      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
