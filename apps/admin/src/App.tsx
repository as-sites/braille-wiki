import { BrowserRouter, Link, Route, Routes } from "react-router";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminLayout } from "./components/layout/AdminLayout";
import { ToastProvider } from "./components/shared/Toaster";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentBrowserPage } from "./pages/DocumentBrowserPage";
import { DocumentEditPage } from "./pages/DocumentEditPage";
import { DocumentHistoryPage } from "./pages/DocumentHistoryPage";
import { DocumentNewPage } from "./pages/DocumentNewPage";
import { DocumentPreviewPage } from "./pages/DocumentPreviewPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/documents" element={<DocumentBrowserPage />} />
              <Route path="/documents/new" element={<DocumentNewPage />} />
              <Route path="/documents/:id/edit" element={<DocumentEditPage />} />
              <Route path="/documents/:id/preview" element={<DocumentPreviewPage />} />
              <Route path="/documents/:id/history" element={<DocumentHistoryPage />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
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
      </BrowserRouter>
    </ToastProvider>
  );
}
