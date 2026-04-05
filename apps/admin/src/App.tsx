import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router";

import { AdminLayout } from "./components/layout/AdminLayout";
import { useAuth } from "./hooks/useAuth";
import { DocumentEditPage } from "./pages/DocumentEditPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";

function StubPage({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

function ProtectedRoutes() {
  const location = useLocation();
  const { loading, user } = useAuth();

  if (loading) {
    return <p>Checking session...</p>;
  }

  if (!user && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  if (user && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AdminLayout />}>
        <Route path="/" element={<StubPage title="Dashboard" />} />
        <Route path="/documents" element={<StubPage title="Document Browser" />} />
        <Route path="/documents/new" element={<StubPage title="Create Document" />} />
        <Route path="/documents/:id/edit" element={<DocumentEditPage />} />
        <Route path="/documents/:id/preview" element={<StubPage title="Document Preview" />} />
        <Route path="/documents/:id/history" element={<StubPage title="Revision History" />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/settings" element={<StubPage title="Settings" />} />
      </Route>

      <Route
        path="*"
        element={
          <main>
            <h1>Not Found</h1>
            <p>
              <Link to="/">Go to dashboard</Link>
            </p>
          </main>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ProtectedRoutes />
    </BrowserRouter>
  );
}
