import {
  db,
  getBreadcrumbs as queryBreadcrumbs,
  getChildren as queryChildren,
  getPublishedDocument as queryPublishedDocument,
  getRootWorks as queryRootWorks,
  getSidebarTree as querySidebarTree,
} from "@braille-docs/db";

export async function getPublishedDocument(path: string) {
  return queryPublishedDocument(db, path);
}

export async function getSidebarTree(rootPath: string) {
  return querySidebarTree(db, rootPath);
}

export async function getBreadcrumbs(path: string) {
  return queryBreadcrumbs(db, path);
}

export async function getRootWorks() {
  return queryRootWorks(db);
}

export async function getChildren(parentPath: string, depth: number) {
  return queryChildren(db, parentPath, depth);
}

export type PublishedDocumentRecord = Awaited<
  ReturnType<typeof getPublishedDocument>
>;

export type BreadcrumbRecord = Awaited<ReturnType<typeof getBreadcrumbs>>;
export type RootWorkRecord = Awaited<ReturnType<typeof getRootWorks>>;
export type SidebarRecord = Awaited<ReturnType<typeof getSidebarTree>>;
