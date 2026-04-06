# 13 Admin UI Shell - Implementation Summary

Date: 2026-04-06

## Scope Completed

Section 13 (Admin UI Shell) has been implemented in the admin SPA with real routes, API wiring, and shared UI primitives replacing prior stubs.

## Implemented Changes

- Replaced stub routing with real page routes and protected routing in apps/admin/src/App.tsx.
- Added login form and auth guard:
  - apps/admin/src/components/auth/LoginForm.tsx
  - apps/admin/src/components/auth/ProtectedRoute.tsx
  - Updated apps/admin/src/pages/LoginPage.tsx
  - Extended session refresh behavior in apps/admin/src/hooks/useAuth.ts
- Implemented dashboard with recently edited docs, recent publishes, and quick links in apps/admin/src/pages/DashboardPage.tsx.
- Implemented document browser with status filtering, search, tree view, archive action, and reorder API call in apps/admin/src/pages/DocumentBrowserPage.tsx.
- Added document tree UI pieces:
  - apps/admin/src/components/documents/DocumentTree.tsx
  - apps/admin/src/components/documents/DocumentTreeItem.tsx
  - apps/admin/src/components/documents/StatusBadge.tsx
- Implemented create-document flow:
  - apps/admin/src/pages/DocumentNewPage.tsx
  - apps/admin/src/components/documents/DocumentCreateForm.tsx
- Implemented draft preview page using serializeToHtml and publish action:
  - apps/admin/src/pages/DocumentPreviewPage.tsx
- Implemented revision history and rollback flow:
  - apps/admin/src/pages/DocumentHistoryPage.tsx
  - apps/admin/src/components/revisions/RevisionList.tsx
  - apps/admin/src/components/revisions/RevisionViewer.tsx
- Implemented settings tabs and role-aware user management:
  - apps/admin/src/pages/SettingsPage.tsx
  - apps/admin/src/components/settings/ProfileSettings.tsx
  - apps/admin/src/components/settings/ApiKeyManager.tsx
  - apps/admin/src/components/settings/UserManager.tsx
- Added shared confirmation dialog and toast system:
  - apps/admin/src/components/shared/ConfirmDialog.tsx
  - apps/admin/src/components/shared/Toaster.tsx
- Updated layout and navigation in apps/admin/src/components/layout/AdminLayout.tsx.
- Expanded admin styles for new shell pages/components in apps/admin/src/styles/app.css.
- Expanded API client helpers for documents/revisions/users/api-keys in apps/admin/src/api/client.ts.
- Added drag-and-drop dependencies in apps/admin/package.json and updated pnpm-lock.yaml.

## Validation

- pnpm install completed successfully.
- pnpm --filter @braille-wiki/admin typecheck passed.

## Important Note

Profile update and password-change form UI is present, but no dedicated backend admin/profile update endpoint is available in the current OpenAPI/admin route surface for persisting those profile/password changes. The current ProfileSettings behavior is therefore intentionally non-destructive placeholder behavior until a backend endpoint is added.

## Follow-up Suggestions

1. Add explicit profile update and password change endpoints to the API and OpenAPI spec.
2. Wire ProfileSettings submit actions to those endpoints.
3. Add integration tests for login, browser reorder, revisions rollback, API key generation/revocation, and admin-only user management visibility.
