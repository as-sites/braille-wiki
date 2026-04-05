# Plan 07 Polish Follow-Up

## Goal

Polish the admin editor implementation from Plan 07 with better UX, stronger safety around unsaved changes, and clearer API error feedback.

## Scope

1. Replace the basic editor toolbar with the official Tiptap simple editor scaffold.
2. Add in-app navigation blocking for unsaved changes (not only browser unload warnings).
3. Improve API error parsing and user-facing error messages.

## Task 1: Adopt Tiptap Simple Editor Scaffold

### Objective

Use the official Tiptap CLI simple editor UI as the starting point, then keep BrailleBlock support and project-specific behavior.

### Steps

1. Run the scaffold command from apps/admin:
   - `pnpm dlx @tiptap/cli init simple-editor`
2. Review generated component locations and naming.
3. Move or map generated components into the existing admin structure under src/components/editor.
4. Keep current extension setup from @braille-docs/editor-schema.
5. Ensure BrailleBlock insertion still exists as a first-class action in the toolbar.
6. Keep or restore any app-specific commands needed for headings, lists, links, and formatting.
7. Remove obsolete custom toolbar code if fully replaced.

### Acceptance Criteria

1. Toolbar UI comes from Tiptap simple editor scaffolded components.
2. Existing editor commands still work.
3. BrailleBlock can be inserted from the toolbar.
4. No typecheck errors in @braille-docs/admin.

## Task 2: Add In-App Navigation Blocking

### Objective

Warn users before route transitions when there are unsaved changes, in addition to existing beforeunload handling.

### Steps

1. Implement a reusable unsaved-changes guard hook in admin app code.
2. Intercept client-side route changes when dirty state is true.
3. Show a confirm dialog before allowing navigation.
4. Permit navigation immediately when there are no unsaved changes.
5. Keep current browser refresh/tab-close warning behavior.
6. Ensure successful save clears dirty state and unblocks navigation.

### Acceptance Criteria

1. Clicking sidebar links while dirty prompts the user.
2. Cancelling keeps the user on the editor page.
3. Confirming proceeds to the target route.
4. Saving the document removes the prompt for normal navigation.

## Task 3: Improve API Error Parsing and Display

### Objective

Show actionable error messages from API responses rather than a generic failure string.

### Steps

1. Add a shared API error utility in src/api that normalizes server error shapes.
2. Parse error payload fields such as error and message when available.
3. Attach status code and endpoint context where useful.
4. Return typed errors from client wrappers in src/api/client.ts.
5. Update DocumentEditPage to display specific errors for load/save/publish.
6. Add friendly fallbacks for network failures and unknown errors.

### Acceptance Criteria

1. Validation and business errors are displayed with meaningful messages.
2. Unauthorized/session issues surface clearly.
3. Network failure messaging is distinct from server validation errors.
4. No new typecheck errors.

## Suggested File Targets

1. apps/admin/src/components/editor/Editor.tsx
2. apps/admin/src/components/editor/Toolbar.tsx (or scaffold replacements)
3. apps/admin/src/pages/DocumentEditPage.tsx
4. apps/admin/src/hooks/useUnsavedChangesGuard.ts (new)
5. apps/admin/src/api/client.ts
6. apps/admin/src/api/errors.ts (new)

## Verification Checklist

1. `pnpm --filter @braille-docs/admin typecheck`
2. `pnpm --filter @braille-docs/admin dev`
3. Open `/documents/:id/edit` with a real document id.
4. Confirm toolbar commands and BrailleBlock insertion work.
5. Make edits, attempt route navigation, verify guard prompt.
6. Save, then navigate again and verify no prompt.
7. Trigger known API errors and verify message clarity.

## Out of Scope

1. Implementing publish pipeline behavior from Plan 08.
2. Building full auth UI from Plan 13.
3. Media workflow changes from Plan 11.
