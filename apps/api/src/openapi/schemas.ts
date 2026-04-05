import { z } from "zod";

/**
 * OpenAPI/Zod schemas for all request/response types.
 * Used for automatic validation and OpenAPI spec generation.
 */

// ============================================================================
// Enums
// ============================================================================

export const DocumentStatus = z.enum(["draft", "published", "archived"]);
export const DocumentAction = z.enum(["save", "publish", "unpublish", "rollback"]);
export const UserRole = z.enum(["admin", "editor"]);

// ============================================================================
// Document Schemas
// ============================================================================

export const DocumentResponse = z.object({
  id: z.string().uuid(),
  path: z.string(),
  title: z.string(),
  slug: z.string(),
  parentPath: z.string().nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable().optional(),
  prosemirrorJson: z.record(z.unknown()).nullable(),
  publishedProsemirrorJson: z.record(z.unknown()).nullable(),
  renderedHtml: z.string().nullable(),
  status: DocumentStatus,
  position: z.number().int(),
  createdBy: z.string().uuid(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateDocumentRequest = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  parentPath: z.string().nullable().optional(),
  description: z.string().optional(),
});

export const UpdateDocumentRequest = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  prosemirrorJson: z.record(z.unknown()).optional(),
});

export const ArchiveDocumentRequest = z.object({});

export const DocumentListResponse = z.object({
  documents: z.array(DocumentResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

// ============================================================================
// Revision Schemas
// ============================================================================

export const RevisionResponse = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  prosemirrorJson: z.record(z.unknown()).nullable(),
  action: DocumentAction,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const RevisionListResponse = z.object({
  revisions: z.array(
    z.object({
      id: z.string().uuid(),
      documentId: z.string().uuid(),
      action: DocumentAction,
      createdBy: z.string().uuid(),
      createdAt: z.string().datetime(),
    }),
  ),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const RollbackRequest = z.object({});

// ============================================================================
// Navigation Schemas
// ============================================================================

export const MoveDocumentRequest = z.object({
  newParentPath: z.string().nullable(),
  newSlug: z.string().optional(),
});

export const ReorderRequest = z.object({
  parentPath: z.string(),
  children: z.array(z.string().uuid()),
});

// ============================================================================
// Publishing Schemas
// ============================================================================

export const PublishRequest = z.object({});
export const UnpublishRequest = z.object({});
export const DiscardRequest = z.object({});

// ============================================================================
// User Schemas
// ============================================================================

export const UserResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRole,
  createdAt: z.string().datetime(),
});

export const CreateUserRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: UserRole,
});

export const UpdateUserRequest = z.object({
  name: z.string().optional(),
  role: UserRole.optional(),
});

export const UserListResponse = z.array(UserResponse);

// ============================================================================
// API Key Schemas
// ============================================================================

export const APIKeyResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
});

export const CreateAPIKeyRequest = z.object({
  name: z.string().min(1),
});

export const CreateAPIKeyResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  createdAt: z.string().datetime(),
});

export const APIKeyListResponse = z.array(APIKeyResponse);

// ============================================================================
// Search Schemas
// ============================================================================

export const SearchResultItem = z.object({
  path: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
});

export const SearchResponse = z.object({
  results: z.array(SearchResultItem),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

// ============================================================================
// Public Document Schemas
// ============================================================================

export const PublicDocumentResponse = z.object({
  path: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  renderedHtml: z.string(),
  publishedAt: z.string().datetime(),
});

export const PublicChildResponse = z.object({
  path: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  position: z.number().int(),
});

export const PublicChildrenResponse = z.array(PublicChildResponse);

export const BacklinkResponse = z.object({
  path: z.string(),
  title: z.string(),
});

export const BacklinksResponse = z.array(BacklinkResponse);

// ============================================================================
// Tree Schemas
// ============================================================================

export const TreeNode: z.ZodType<any> = z.object({
  path: z.string(),
  title: z.string(),
  position: z.number().int(),
  children: z.array(z.lazy(() => TreeNode)),
});

export const TreeResponse = TreeNode;

// ============================================================================
// Media Schemas
// ============================================================================

export const MediaResponse = z.object({
  id: z.string().uuid(),
  storageKey: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  altText: z.string().nullable(),
  uploadedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  url: z.string(),
});

export const MediaListResponse = z.object({
  media: z.array(MediaResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const UpdateMediaRequest = z.object({
  altText: z.string().nullable().optional(),
  filename: z.string().optional(),
});

export const DeleteMediaResponse = z.object({
  id: z.string().uuid(),
  referenced: z.boolean(),
});

// ============================================================================
// Error Schemas
// ============================================================================

export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string(),
});
