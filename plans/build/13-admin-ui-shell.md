# 13 — Admin UI Shell

## Scope

Implement all non-editor pages in the admin SPA: login, dashboard, document browser with tree view, document creation, revision history with rollback, document preview, user management, API key management, and settings.

## Prerequisites

- **03 — Shared Packages** (types, enums)
- **05 — Auth** (login flow, session management)
- **06 — API Core** (all admin endpoints)
- **07 — Editor + BrailleBlock** (admin SPA is already scaffolded, React Router is set up, API client is configured)

## Unblocks

None — this is a leaf plan.

## Reference Docs

- `plans/routes.md` — "3. Admin UI" section (all client-side routes)
- `plans/project-instructions.md` — "3. Admin Dashboard" section, "Target Audience — Content Editors"
- `plans/tech-stack.md` — "Admin UI Components" section

## Packages to Install

In `apps/admin/package.json` (in addition to packages from plan 07):

| Package | Type | Purpose |
|---------|------|---------|
| `@dnd-kit/core` | dependency | Drag-and-drop library for document reordering |
| `@dnd-kit/sortable` | dependency | Sortable preset for dnd-kit |
| `better-auth/react` | dependency | React hooks for better-auth (useSession, signIn, signOut) |

Optional — add individual shadcn/ui components as needed:
| Package | Type | Purpose |
|---------|------|---------|
| `@radix-ui/react-dialog` | dependency | Modal dialogs (if Tiptap primitives don't cover it) |
| `@radix-ui/react-tabs` | dependency | Tabs component (settings page) |
| `@radix-ui/react-toast` | dependency | Toast notifications |

## Deliverables

```
apps/admin/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx             # Login form
│   │   ├── DashboardPage.tsx         # Home dashboard
│   │   ├── DocumentBrowserPage.tsx   # Document tree browser
│   │   ├── DocumentNewPage.tsx       # Create new document
│   │   ├── DocumentPreviewPage.tsx   # Preview published rendering
│   │   ├── DocumentHistoryPage.tsx   # Revision history
│   │   └── SettingsPage.tsx          # Account settings, user mgmt, API keys
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx         # Email/password form
│   │   │   └── ProtectedRoute.tsx    # Route guard (redirect to /login if no session)
│   │   ├── documents/
│   │   │   ├── DocumentTree.tsx      # Hierarchical tree view with expand/collapse
│   │   │   ├── DocumentTreeItem.tsx  # Single tree node (title, status badge, actions)
│   │   │   ├── DocumentCreateForm.tsx # Title, parent picker, slug
│   │   │   └── StatusBadge.tsx       # Visual badge for draft/published/archived
│   │   ├── revisions/
│   │   │   ├── RevisionList.tsx      # List of revisions with action, author, timestamp
│   │   │   └── RevisionViewer.tsx    # Read-only Tiptap editor showing old content
│   │   ├── settings/
│   │   │   ├── ProfileSettings.tsx   # Name, email, password change
│   │   │   ├── ApiKeyManager.tsx     # Generate, list, revoke API keys
│   │   │   └── UserManager.tsx       # Admin-only: list, invite, edit role, delete users
│   │   └── shared/
│   │       ├── Toaster.tsx           # Toast notification container
│   │       └── ConfirmDialog.tsx     # Confirmation modal for destructive actions
```

## Requirements

### Login Page (`pages/LoginPage.tsx`)

- Email and password form
- Calls better-auth's sign-in endpoint via the React client
- On success, redirect to `/` (dashboard)
- Show error messages for invalid credentials
- If already authenticated, redirect to `/`
- Simple, clean design — these users are non-technical

### Protected Route (`components/auth/ProtectedRoute.tsx`)

- Wrap all routes except `/login`
- Check session on mount via better-auth React hook
- If no session, redirect to `/login`
- Show loading state while checking session

### Dashboard (`pages/DashboardPage.tsx`)

- **Recently edited documents:** Last 10 documents updated by the current user, with title, status, and relative timestamp
- **Recent publishes:** Last 10 documents published by anyone
- **Quick links:** Buttons to create new document, browse all documents, open settings
- Data fetched via the admin documents API with appropriate filters

### Document Browser (`pages/DocumentBrowserPage.tsx`)

- **Tree view:** Hierarchical view of all documents (all statuses)
  - Expand/collapse branches
  - Each node shows: title, status badge (draft/published/archived), last updated
  - Click a node to navigate to its editor page
- **Filters:** Dropdown to filter by status (all, draft, published, archived)
- **Search:** Text input to filter by title (client-side filtering of loaded tree, or server-side search)
- **Drag-and-drop reorder:** Reorder siblings within the same parent
  - Uses `@dnd-kit/sortable`
  - On drop, calls `PUT /api/admin/documents/reorder` with the new order
- **Context actions** per document: Edit, Preview, History, Archive/Unarchive

### Document Creation (`pages/DocumentNewPage.tsx`)

- Form fields:
  - **Title** (required)
  - **Parent** — tree picker to select parent document (or root level)
  - **Slug** — auto-generated from title (slugified), editable
- On submit: calls `POST /api/admin/documents`
- On success: redirect to `/documents/:id/edit`

### Document Preview (`pages/DocumentPreviewPage.tsx`)

- Loads the current draft's ProseMirror JSON
- Serializes it to HTML using `serializeToHtml()` from `@braille-docs/editor-schema`
- Renders the HTML in a read-only view that matches the public site's styling
- Shows a banner: "This is a preview of the current draft. Publish to make it live."
- "Edit" button to go back to the editor
- "Publish" button to publish directly from preview

### Revision History (`pages/DocumentHistoryPage.tsx`)

- List of revisions from `GET /api/admin/documents/:id/revisions`
- Each row: action (save/publish/rollback), author name, timestamp
- Click a revision to view it in a read-only Tiptap editor (`RevisionViewer.tsx`)
- **Rollback button:** Calls `POST /api/admin/documents/:id/rollback/:revisionId`
  - Shows confirmation dialog
  - On success, redirects to the editor with the restored content
  - Does NOT auto-publish — user reviews and publishes manually

### Settings Page (`pages/SettingsPage.tsx`)

Tabbed layout:

#### Profile Tab (all users)
- Edit name
- Change password (current password + new password + confirm)

#### API Keys Tab (all users)
- List of the user's API keys: name, created date, last used date
- "Generate new key" button → creates key, shows the raw value **once** with a copy button and warning
- "Revoke" button per key → confirmation dialog → deletes key

#### Users Tab (admin only)
- Visible only to admin role
- Table of all users: name, email, role, created date
- "Invite user" button → form: name, email, role
- Edit role dropdown per user (admin users can promote editor → admin)
- Delete button per user → confirmation dialog
- Guards: admins cannot delete themselves, editors don't see this tab

### UI Design Principles

The target users are non-technical (older librarians, some blind users):

- **No technical jargon** in the UI. No "JSON", "commit", "deploy", "cache", "endpoint"
- **Clear labels:** "Save Draft", "Publish", "Undo Changes" (not "Discard Draft")
- **Confirmation dialogs** for all destructive actions (archive, delete, rollback)
- **Toast notifications** for save success, publish success, errors
- **Loading states** for all async operations
- **Consistent navigation:** Sidebar or top nav always visible, breadcrumbs for deep pages

### Reuse Tiptap Primitives

The Tiptap Simple Editor template (scaffolded in plan 07) provides generic UI primitives:
- Button, Input, Label, Card, Popover, DropdownMenu, Separator
- Use these for non-editor pages before reaching for shadcn/ui
- Only add shadcn/ui components for things the Tiptap primitives don't cover (data tables, tabs, toasts)

## Verification

1. Login flow: enter credentials → redirected to dashboard → session persists on refresh
2. Dashboard: shows recently edited documents and recent publishes
3. Document browser: tree renders with all documents, expand/collapse works, status badges display
4. Drag-and-drop reorder: drag a document to a new position, verify the API is called and the order persists
5. Create document: fill form, submit, redirected to editor with new empty document
6. Preview: shows rendered HTML matching the public site styling
7. History: lists revisions, click to view, rollback restores content
8. Settings: change name, change password, generate/revoke API keys
9. Admin users: can see and use the Users tab, invite new users, change roles
10. Editor users: cannot see the Users tab, cannot access user management endpoints
11. All destructive actions show confirmation dialogs
12. Toast notifications appear for success/error states

## Notes

- The admin dashboard deliberately hides all technical details. Editors never see Git, Markdown, JSON, or terminal output.
- Screen reader accessibility on the admin editor is a nice-to-have but not a hard requirement (per project spec). Focus accessibility efforts on the public docs site.
- The document tree may need lazy loading for very large hierarchies (1,500+ pages). Load top-level, then expand subtrees on demand.
- better-auth's React client provides hooks like `useSession()` that handle session state. Use these rather than building custom auth state management.
- The "preview" page serializes client-side using the same function the server uses at publish time. This ensures WYSIWYG fidelity.
