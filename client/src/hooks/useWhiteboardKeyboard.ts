import { useEffect } from 'react';
import type * as Y from 'yjs';
import type { Shape } from '@/types/whiteboard';
import * as WHITEBOARD from '@/constants/whiteboard';

interface UseWhiteboardKeyboardProps {
  selectedId: string | null;
  selectedIds: Set<string>;
  shapesMap: Y.Map<Shape>;
  ydoc: Y.Doc;
  undoManager: Y.UndoManager | null;
  onClearSelection: () => void;
}

export function useWhiteboardKeyboard({
  selectedId,
  selectedIds,
  shapesMap,
  ydoc,
  undoManager,
  onClearSelection,
}: UseWhiteboardKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoManager?.undo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.metaKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        undoManager?.redo();
        return;
      }

      // Arrow keys: Move selected shapes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        let dx = 0, dy = 0;

        if (e.key === 'ArrowUp') dy = -WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;
        if (e.key === 'ArrowDown') dy = WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;
        if (e.key === 'ArrowLeft') dx = -WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;
        if (e.key === 'ArrowRight') dx = WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;

        const idsToMove = new Set<string>();
        if (selectedId) idsToMove.add(selectedId);
        selectedIds.forEach(id => idsToMove.add(id));

        if (idsToMove.size > 0) {
          ydoc.transact(() => {
            idsToMove.forEach(id => {
              const shape = shapesMap.get(id) as Shape | undefined;
              if (shape) {
                shapesMap.set(id, {
                  ...shape,
                  x: shape.x + dx,
                  y: shape.y + dy
                });
              }
            });
          });
        }
      }

      // Delete: Backspace or Delete key
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();

        const idsToDelete = new Set<string>();
        if (selectedId) idsToDelete.add(selectedId);
        selectedIds.forEach(id => idsToDelete.add(id));

        if (idsToDelete.size > 0) {
          ydoc.transact(() => {
            idsToDelete.forEach(id => {
              shapesMap.delete(id);
            });
          });

          onClearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedIds, shapesMap, ydoc, undoManager, onClearSelection]);
}
