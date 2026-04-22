'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, FileText, Pencil } from 'lucide-react';
import { Input, Button, Label } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WidgetEditorProps } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

interface MindmapData {
  title?: string;
  root: MindmapNode;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Deep-clone and update a specific node by id */
function updateNodeInTree(
  node: MindmapNode,
  targetId: string,
  updater: (n: MindmapNode) => MindmapNode | null,
): MindmapNode | null {
  if (node.id === targetId) return updater(node);
  if (!node.children) return node;
  const newChildren: MindmapNode[] = [];
  for (const child of node.children) {
    const result = updateNodeInTree(child, targetId, updater);
    if (result !== null) newChildren.push(result);
  }
  return { ...node, children: newChildren };
}

/** Parse indented text into a tree. Each line is a node; tabs/2-spaces = depth. */
function parseIndentedText(text: string): MindmapNode | null {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  function getDepth(line: string): number {
    const match = line.match(/^(\t*)/);
    if (match && match[1].length > 0) return match[1].length;
    const spaceMatch = line.match(/^( *)/);
    return spaceMatch ? Math.floor(spaceMatch[1].length / 2) : 0;
  }

  const rootLabel = lines[0].trim().replace(/^[-*]\s*/, '');
  const root: MindmapNode = { id: generateId(), label: rootLabel, children: [] };
  const stack: { node: MindmapNode; depth: number }[] = [{ node: root, depth: 0 }];

  for (let i = 1; i < lines.length; i++) {
    const depth = getDepth(lines[i]);
    const label = lines[i].trim().replace(/^[-*]\s*/, '');
    const newNode: MindmapNode = { id: generateId(), label, children: [] };

    // Find parent: last node in stack with depth < current
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    if (!parent.children) parent.children = [];
    parent.children.push(newNode);
    stack.push({ node: newNode, depth });
  }

  return root;
}

/* ------------------------------------------------------------------ */
/*  NodeEditor — recursive editable tree item                          */
/* ------------------------------------------------------------------ */

function NodeEditor({
  node,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
  isRoot,
}: {
  node: MindmapNode;
  depth: number;
  onUpdate: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  isRoot: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l border-border pl-3')}>
      <div className="flex items-center gap-1 group py-0.5">
        {/* Expand/collapse toggle */}
        <button
          type="button"
          className={cn(
            'w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors',
            !hasChildren && 'invisible',
          )}
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Label (inline edit) */}
        {editing ? (
          <Input
            autoFocus
            className="h-7 text-sm flex-1"
            defaultValue={node.label}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v) onUpdate(node.id, v);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = e.currentTarget.value.trim();
                if (v) onUpdate(node.id, v);
                setEditing(false);
              }
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span
            className="text-sm truncate max-w-[200px] cursor-pointer hover:text-primary transition-colors"
            onDoubleClick={() => setEditing(true)}
            title={node.label}
          >
            {node.label}
          </span>
        )}

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setEditing(true)}
            title="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddChild(node.id)}
            title="Ajouter un enfant"
          >
            <Plus className="h-3 w-3" />
          </Button>
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete(node.id)}
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <NodeEditor
              key={child.id}
              node={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              isRoot={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Editor                                                        */
/* ------------------------------------------------------------------ */

export function MindmapEditor({ data, onSave }: WidgetEditorProps) {
  const mindmap = data as unknown as MindmapData;
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const root: MindmapNode = mindmap.root ?? { id: generateId(), label: 'Sujet central', children: [] };

  const save = useCallback(
    (newRoot: MindmapNode, title?: string) => {
      onSave({ ...data, root: newRoot, title: title ?? mindmap.title });
    },
    [data, mindmap.title, onSave],
  );

  const handleUpdateLabel = useCallback(
    (id: string, label: string) => {
      const updated = updateNodeInTree(root, id, (n) => ({ ...n, label }));
      if (updated) save(updated);
    },
    [root, save],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updated = updateNodeInTree(root, id, () => null);
      if (updated) save(updated);
    },
    [root, save],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const newChild: MindmapNode = { id: generateId(), label: 'Nouveau noeud', children: [] };
      const updated = updateNodeInTree(root, parentId, (n) => ({
        ...n,
        children: [...(n.children ?? []), newChild],
      }));
      if (updated) save(updated);
    },
    [root, save],
  );

  const handleImport = useCallback(() => {
    const parsed = parseIndentedText(importText);
    if (parsed) {
      save(parsed);
      setImportText('');
      setShowImport(false);
    }
  }, [importText, save]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={mindmap.title ?? ''}
          onChange={(e) => onSave({ ...data, title: e.target.value })}
          placeholder="Titre de la carte mentale"
        />
      </div>

      {/* Tree editor */}
      <div className="space-y-2">
        <Label>Structure</Label>
        <div className="border rounded-lg p-3 bg-muted/30 max-h-80 overflow-y-auto">
          <NodeEditor
            node={root}
            depth={0}
            onUpdate={handleUpdateLabel}
            onDelete={handleDelete}
            onAddChild={handleAddChild}
            isRoot
          />
        </div>
      </div>

      {/* Import from indented text */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowImport((p) => !p)}
        >
          <FileText className="h-3.5 w-3.5" />
          {showImport ? 'Annuler l\'import' : 'Importer un texte indente'}
        </Button>

        {showImport && (
          <div className="space-y-2">
            <textarea
              className="w-full h-32 text-sm font-mono border rounded-lg p-3 bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={`Sujet principal\n\tBranche 1\n\t\tSous-branche A\n\t\tSous-branche B\n\tBranche 2`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <Button size="sm" onClick={handleImport} disabled={!importText.trim()}>
              Importer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
