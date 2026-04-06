import { getParentPath } from "@braille-wiki/shared";

export interface FlatTreeNode {
  path: string;
  title: string;
  position: number;
}

export interface TreeNode extends FlatTreeNode {
  children: TreeNode[];
  containsCurrent: boolean;
  href: string;
  isCurrent: boolean;
}

export interface SidebarLinkItem {
  label: string;
  link: string;
}

export interface SidebarGroupItem {
  label: string;
  collapsed?: boolean;
  items: SidebarItem[];
}

export type SidebarItem = SidebarLinkItem | SidebarGroupItem;

function sortNodes(left: FlatTreeNode, right: FlatTreeNode) {
  const depthDifference =
    left.path.split("/").length - right.path.split("/").length;

  if (depthDifference !== 0) {
    return depthDifference;
  }

  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.path.localeCompare(right.path);
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.path.localeCompare(right.path);
  });

  for (const node of nodes) {
    sortTree(node.children);
  }

  return nodes;
}

function markCurrent(node: TreeNode, currentPath: string): boolean {
  node.isCurrent = node.path === currentPath;
  node.containsCurrent = node.isCurrent;

  for (const child of node.children) {
    if (markCurrent(child, currentPath)) {
      node.containsCurrent = true;
    }
  }

  return node.containsCurrent;
}

function toSidebarItem(node: TreeNode): SidebarItem {
  if (node.children.length === 0) {
    return {
      label: node.title,
      link: node.href,
    };
  }

  return {
    label: node.title,
    collapsed: !node.containsCurrent,
    items: [
      {
        label: "Overview",
        link: node.href,
      },
      ...node.children.map(toSidebarItem),
    ],
  };
}

export function buildTree(
  entries: FlatTreeNode[],
  currentPath: string,
): TreeNode[] {
  const sortedEntries = [...entries].sort(sortNodes);
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const entry of sortedEntries) {
    nodes.set(entry.path, {
      ...entry,
      children: [],
      containsCurrent: false,
      href: `/${entry.path}`,
      isCurrent: false,
    });
  }

  for (const entry of sortedEntries) {
    const node = nodes.get(entry.path);

    if (!node) {
      continue;
    }

    const parentPath = getParentPath(entry.path);
    const parent = parentPath ? nodes.get(parentPath) : undefined;

    if (parent) {
      parent.children.push(node);
      continue;
    }

    roots.push(node);
  }

  sortTree(roots);

  for (const root of roots) {
    markCurrent(root, currentPath);
  }

  return roots;
}

export function buildSidebar(entries: FlatTreeNode[], currentPath: string) {
  const [root] = buildTree(entries, currentPath);

  if (!root) {
    return [];
  }

  return [
    {
      label: root.title,
      link: root.href,
    },
    ...root.children.map(toSidebarItem),
  ];
}
