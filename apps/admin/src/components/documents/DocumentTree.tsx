import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useMemo, useState } from "react";

import { DocumentTreeItem, type TreeNode } from "./DocumentTreeItem";

type DocumentTreeProps = {
  nodes: TreeNode[];
  onArchive: (node: TreeNode) => void;
  onReorder: (parentPath: string, children: string[]) => Promise<void>;
};

export function DocumentTree({ nodes, onArchive, onReorder }: DocumentTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [localNodes, setLocalNodes] = useState<TreeNode[]>(nodes);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rootIds = useMemo(() => localNodes.map((node) => node.id), [localNodes]);

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  const toggle = (id: string) => {
    setExpanded((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = rootIds.indexOf(String(active.id));
    const newIndex = rootIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(localNodes, oldIndex, newIndex);
    setLocalNodes(reordered);

    await onReorder("", reordered.map((item) => item.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
        <ul className="tree-list">
          {localNodes.map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              expanded={Boolean(expanded[node.id])}
              expandedMap={expanded}
              level={0}
              onToggle={toggle}
              onArchive={onArchive}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

type TreeBranchProps = {
  node: TreeNode;
  level: number;
  expanded: boolean;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  onArchive: (node: TreeNode) => void;
};

function TreeBranch({ node, level, expanded, expandedMap, onToggle, onArchive }: TreeBranchProps) {
  return (
    <>
      <DocumentTreeItem
        node={node}
        level={level}
        expanded={expanded}
        onToggle={onToggle}
        onArchive={onArchive}
      />
      {expanded
        ? node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              level={level + 1}
              expanded={Boolean(expandedMap[child.id])}
              expandedMap={expandedMap}
              onToggle={onToggle}
              onArchive={onArchive}
            />
          ))
        : null}
    </>
  );
}
