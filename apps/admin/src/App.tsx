import { BrowserRouter, Link, Route, Routes } from "react-router";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminLayout } from "./components/layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentBrowserPage } from "./pages/DocumentBrowserPage";
import { DocumentEditPage } from "./pages/DocumentEditPage";
import { DocumentHistoryPage } from "./pages/DocumentHistoryPage";
import { DocumentNewPage } from "./pages/DocumentNewPage";
import { DocumentPreviewPage } from "./pages/DocumentPreviewPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";
import { SettingsPage } from "./pages/SettingsPage";
import { InviteAcceptPage } from "./pages/InviteAcceptPage";

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/accept" element={<InviteAcceptPage />} />

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
              <main className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                  <h1 className="text-2xl font-bold">Not Found</h1>
                  <p>
                    <Link to="/" className="text-primary underline">
                      Go to dashboard
                    </Link>
                  </p>
                </div>
              </main>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
}
