import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router";

import { StatusBadge } from "./StatusBadge";

export type TreeNode = {
  id: string;
  path: string;
  title: string;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  parentPath: string;
  children: TreeNode[];
};

type DocumentTreeItemProps = {
  node: TreeNode;
  level: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onArchive: (node: TreeNode) => void;
};

export function DocumentTreeItem({
  node,
  level,
  expanded,
  onToggle,
  onArchive,
}: DocumentTreeItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div className="tree-item" style={{ paddingLeft: `${level * 1.25}rem` }}>
        <button
          type="button"
          className="tree-item__toggle"
          onClick={() => {
            onToggle(node.id);
          }}
          disabled={node.children.length === 0}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {node.children.length === 0 ? "-" : expanded ? "v" : ">"}
        </button>

        <button type="button" className="tree-item__drag" {...attributes} {...listeners}>
          Drag
        </button>

        <div className="tree-item__content">
          <Link to={`/documents/${node.id}/edit`}>{node.title}</Link>
          <small>{new Date(node.updatedAt).toLocaleString()}</small>
        </div>

        <StatusBadge status={node.status} />

        <div className="tree-item__actions">
          <Link to={`/documents/${node.id}/preview`}>Preview</Link>
          <Link to={`/documents/${node.id}/history`}>History</Link>
          <button
            type="button"
            onClick={() => {
              onArchive(node);
            }}
          >
            {node.status === "archived" ? "Keep archived" : "Archive"}
          </button>
        </div>
      </div>
    </li>
  );
}
