import { Navigate, useNavigate } from "react-router";

import { LoginForm } from "../components/auth/LoginForm";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="login-page">
      <section className="card">
        <h1>Sign in</h1>
        <p>Use your staff account to manage documents.</p>
      </section>

      <LoginForm
        onSuccess={() => {
          void refresh().finally(() => {
            navigate("/");
          });
        }}
      />
    </main>
  );
}
