import { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Transformer, Line, Text } from 'react-konva';
import Konva from 'konva';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Cursor from './Cursor';
import { ShareDialog } from './components/workspace/ShareDialog';
import { supabase } from './config/supabase';

type Tool = 'select' | 'rectangle' | 'pencil' | 'text' | null;

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  text?: string;
  fontSize?: number;
  color: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

interface CursorState {
  x: number;
  y: number;
  user: string;
}

const generateUserColor = (userId: number) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  return colors[userId % colors.length];
};

// Ramer-Douglas-Peucker algorithm for line simplification
const simplifyPath = (points: number[], tolerance: number = 2): number[] => {
  if (points.length <= 4) return points; // Need at least 2 points (4 values)

  const sqTolerance = tolerance * tolerance;

  // Helper to get distance from point to line segment
  const getSquareSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    let x = x1;
    let y = y1;
    let dx = x2 - x1;
    let dy = y2 - y1;

    if (dx !== 0 || dy !== 0) {
      const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = x2;
        y = y2;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = px - x;
    dy = py - y;
    return dx * dx + dy * dy;
  };

  // Simplify recursive
  const simplifyDouglasPeucker = (points: number[], first: number, last: number, sqTolerance: number, simplified: number[]) => {
    let maxSqDist = sqTolerance;
    let index = 0;

    const x1 = points[first * 2];
    const y1 = points[first * 2 + 1];
    const x2 = points[last * 2];
    const y2 = points[last * 2 + 1];

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSquareSegmentDistance(
        points[i * 2],
        points[i * 2 + 1],
        x1, y1, x2, y2
      );

      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1) simplifyDouglasPeucker(points, first, index, sqTolerance, simplified);
      simplified.push(points[index * 2], points[index * 2 + 1]);
      if (last - index > 1) simplifyDouglasPeucker(points, index, last, sqTolerance, simplified);
    }
  };

  const numPoints = points.length / 2;
  const simplified = [points[0], points[1]]; // First point
  simplifyDouglasPeucker(points, 0, numPoints - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 2], points[points.length - 1]); // Last point

  return simplified;
};

interface WhiteboardProps {
  roomName?: string;
  workspaceId?: string;
  workspaceName?: string;
  userRole?: string;
}

export const Whiteboard = ({ roomName = 'syncspace-room', workspaceId, workspaceName, userRole = 'editor' }: WhiteboardProps) => {
  const isViewer = userRole === 'viewer';
  const canEdit = !isViewer;

  const [shapes, setShapes] = useState<Map<string, Shape>>(new Map());
  const [remoteCursors, setRemoteCursors] = useState<Map<number, CursorState>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textareaValue, setTextareaValue] = useState('');
  const [textareaPosition, setTextareaPosition] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [ydoc] = useState(() => new Y.Doc());
  const [shapesMap] = useState(() => ydoc.getMap('shapes'));
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [userName, setUserName] = useState('User');
  const [isEditingName, setIsEditingName] = useState(false);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map());
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isDrawing = useRef(false);
  const isSelecting = useRef(false);
  const isPanning = useRef(false);
  const currentLineId = useRef<string | null>(null);
  const lastUpdateTime = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Get user's display name from Supabase
  useEffect(() => {
    const getUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get from profile first
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          // Fallback to auth metadata
          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
          setUserName(name);
        }
      }
    };

    getUserName();
  }, []);

  useEffect(() => {
    // Connect to the WebSocket server
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:1234';
    const provider = new WebsocketProvider(
      wsUrl,
      roomName,
      ydoc
    );

    providerRef.current = provider;

    provider.on('status', (event: { status: string }) => {
      console.log('WebSocket status:', event.status);
    });

    // Set up awareness
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', userName);

    // Observe awareness changes for remote cursors
    const awarenessUpdateHandler = () => {
      const states = awareness.getStates();
      const newCursors = new Map<number, CursorState>();

      states.forEach((state, clientId) => {
        if (clientId !== awareness.clientID && state.x !== undefined && state.y !== undefined) {
          newCursors.set(clientId, {
            x: state.x,
            y: state.y,
            user: state.user || 'Anonymous'
          });
        }
      });

      setRemoteCursors(newCursors);
    };

    awareness.on('change', awarenessUpdateHandler);

    // Initialize UndoManager
    const undoManager = new Y.UndoManager(shapesMap);
    undoManagerRef.current = undoManager;

    // Observe changes to the Y.Map and update React state
    const observer = () => {
      const newShapes = new Map<string, Shape>();
      shapesMap.forEach((value, key) => {
        newShapes.set(key, value as Shape);
      });
      setShapes(newShapes);
    };

    shapesMap.observe(observer);

    // Initial sync
    observer();

    // Cleanup
    return () => {
      shapesMap.unobserve(observer);
      awareness.off('change', awarenessUpdateHandler);
      provider.destroy();
    };
  }, [ydoc, shapesMap, userName]);

  // Attach transformer to selected shape(s)
  useEffect(() => {
    if (transformerRef.current) {
      const selectedNodes: Konva.Shape[] = [];

      // Add single selection
      if (selectedId) {
        const node = shapeRefs.current.get(selectedId);
        if (node) selectedNodes.push(node);
      }

      // Add all multi-selected items
      selectedIds.forEach(id => {
        if (id !== selectedId) {
          const node = shapeRefs.current.get(id);
          if (node) selectedNodes.push(node);
        }
      });

      transformerRef.current.nodes(selectedNodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, selectedIds]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoManagerRef.current?.undo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.metaKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        undoManagerRef.current?.redo();
        return;
      }

      // Arrow keys: Move selected shapes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        const moveAmount = 10; // pixels to move
        let dx = 0, dy = 0;

        if (e.key === 'ArrowUp') dy = -moveAmount;
        if (e.key === 'ArrowDown') dy = moveAmount;
        if (e.key === 'ArrowLeft') dx = -moveAmount;
        if (e.key === 'ArrowRight') dx = moveAmount;

        // Collect all IDs to move (avoid duplicates)
        const idsToMove = new Set<string>();
        if (selectedId) idsToMove.add(selectedId);
        selectedIds.forEach(id => idsToMove.add(id));

        if (idsToMove.size > 0) {
          // Move all in a single transaction for undo/redo
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

      // Delete: Backspace or Delete key (delete all selected shapes)
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();

        // Collect all IDs to delete (avoid duplicates)
        const idsToDelete = new Set<string>();
        if (selectedId) idsToDelete.add(selectedId);
        selectedIds.forEach(id => idsToDelete.add(id));

        if (idsToDelete.size > 0) {
          // Delete all in a single transaction for undo/redo
          ydoc.transact(() => {
            idsToDelete.forEach(id => {
              shapesMap.delete(id);
            });
          });

          console.log(`Deleted ${idsToDelete.size} shape(s)`);
          setSelectedId(null);
          setSelectedIds(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, selectedIds, shapesMap]);

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      const textarea = textareaRef.current;
      // Focus and select the textarea
      setTimeout(() => {
        textarea.focus();
        textarea.select();
      }, 10);
    }
  }, [editingTextId]);

  const handleShapeClick = (shapeId: string) => {
    setSelectedId(shapeId);
  };

  const handleStageClick = (e: any) => {
    // Deselect when clicking on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  const handleUndo = () => {
    console.log('Undo requested');
    if (undoManagerRef.current && undoManagerRef.current.canUndo()) {
      undoManagerRef.current.undo();
      console.log('Undo performed');
    } else {
      console.log('Cannot undo - stack is empty');
    }
  };

  const handleRedo = () => {
    console.log('Redo requested');
    if (undoManagerRef.current && undoManagerRef.current.canRedo()) {
      undoManagerRef.current.redo();
      console.log('Redo performed');
    } else {
      console.log('Cannot redo - stack is empty');
    }
  };

  const handleTransformEnd = (shapeId: string, e: any) => {
    const node = e.target;
    const shape = shapesMap.get(shapeId) as Shape | undefined;

    if (shape) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      const updatedShape: any = {
        ...shape,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      };

      // For rectangles and circles, update actual width/height based on scale
      if (shape.type === 'rectangle') {
        updatedShape.width = Math.max(5, node.width() * scaleX);
        updatedShape.height = Math.max(5, node.height() * scaleY);
        updatedShape.scaleX = 1;
        updatedShape.scaleY = 1;

        // Reset the node's scale immediately
        node.scaleX(1);
        node.scaleY(1);
        node.width(updatedShape.width);
        node.height(updatedShape.height);
      } else if (shape.type === 'circle') {
        updatedShape.radius = Math.max(5, (shape.radius || 50) * scaleX);
        updatedShape.scaleX = 1;
        updatedShape.scaleY = 1;

        // Reset the node's scale immediately
        node.scaleX(1);
        node.scaleY(1);
        node.radius(updatedShape.radius);
      } else if (shape.type === 'line') {
        // For lines, apply scale to all points and reset scale
        const points = shape.points || [];
        const scaledPoints = points.map((point, index) => {
          return index % 2 === 0 ? point * scaleX : point * scaleY;
        });

        updatedShape.points = scaledPoints;
        updatedShape.scaleX = 1;
        updatedShape.scaleY = 1;

        // Reset the node's scale immediately
        node.scaleX(1);
        node.scaleY(1);
        node.points(scaledPoints);
      } else if (shape.type === 'text') {
        // For text, adjust width to wrap text instead of scaling
        const newWidth = Math.max(50, node.width() * scaleX);
        updatedShape.width = newWidth;
        updatedShape.scaleX = 1;
        updatedShape.scaleY = 1;

        // Reset the node's scale immediately
        node.scaleX(1);
        node.scaleY(1);
        node.width(newWidth);

        console.log(`Text resized to width: ${newWidth}px - text will wrap`);
      }

      shapesMap.set(shapeId, updatedShape);
    }
  };

  const handleDragEnd = (shapeId: string, e: any) => {
    const shape = shapesMap.get(shapeId);
    if (shape) {
      const updatedShape = {
        ...shape,
        x: e.target.x(),
        y: e.target.y()
      };
      shapesMap.set(shapeId, updatedShape);
    }
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();

    // Viewers can only pan, not draw or edit
    if (isViewer) {
      return;
    }

    // Handle panning with space bar or middle mouse button
    if (e.evt.button === 1 || e.evt.spaceKey) {
      isPanning.current = true;
      stage.container().style.cursor = 'grabbing';
      return;
    }

    if (tool === 'select') {
      // Check if clicking on empty space
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        const pos = stage.getPointerPosition();
        if (pos) {
          // Convert to stage coordinates
          const transform = stage.getAbsoluteTransform().copy().invert();
          const stagePos = transform.point(pos);

          isSelecting.current = true;
          setSelectionBox({ x1: stagePos.x, y1: stagePos.y, x2: stagePos.x, y2: stagePos.y });
          setSelectedIds(new Set());
        }
      }
    } else if (tool === 'pencil') {
      const pos = stage.getPointerPosition();
      if (pos) {
        // Convert to stage coordinates
        const transform = stage.getAbsoluteTransform().copy().invert();
        const stagePos = transform.point(pos);

        isDrawing.current = true;
        const id = `line-${Date.now()}`;
        currentLineId.current = id;

        const newLine: Shape = {
          id,
          type: 'line',
          x: 0,
          y: 0,
          points: [stagePos.x, stagePos.y],
          color: selectedColor
        };

        shapesMap.set(id, newLine);
        lastUpdateTime.current = Date.now();
      }
    } else if (tool === 'rectangle') {
      const pos = stage.getPointerPosition();
      if (pos) {
        // Convert to stage coordinates
        const transform = stage.getAbsoluteTransform().copy().invert();
        const stagePos = transform.point(pos);

        const id = `rect-${Date.now()}`;
        const newRect: Shape = {
          id,
          type: 'rectangle',
          x: stagePos.x,
          y: stagePos.y,
          width: 100,
          height: 100,
          color: selectedColor
        };
        shapesMap.set(id, newRect);
      }
    } else if (tool === 'text') {
      // If currently editing, finish that first
      if (editingTextId) {
        handleTextBlur();
        // Wait a bit for state to update before creating new text
        setTimeout(() => {
          createNewText(e);
        }, 10);
      } else {
        createNewText(e);
      }
    }
  };

  const createNewText = (e: any) => {
    // Only create text if clicking on empty space, not on existing shapes
    const clickedOnShape = e.target.attrs && e.target.attrs.id;
    if (clickedOnShape) {
      console.log('Clicked on shape, not creating text');
      return;
    }

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (pos) {
      console.log('Creating text at', pos.x, pos.y);
      const id = `text-${Date.now()}`;

      setEditingTextId(id);
      setTextareaValue('');
      setTextareaPosition({ x: pos.x, y: pos.y });

      console.log('Set editing state:', { id, pos });
    }
  };


  const handleTextBlur = () => {
    if (editingTextId && textareaValue.trim()) {
      // Only save if there's actual text content
      const newText: Shape = {
        id: editingTextId,
        type: 'text',
        x: textareaPosition.x,
        y: textareaPosition.y,
        text: textareaValue,
        fontSize: 20,
        color: selectedColor
      };
      shapesMap.set(editingTextId, newText);
    } else if (editingTextId) {
      // Remove from local state if empty
      setShapes(prev => {
        const newMap = new Map(prev);
        newMap.delete(editingTextId);
        return newMap;
      });
      // Also delete from Y.js if it exists there
      if (shapesMap.has(editingTextId)) {
        shapesMap.delete(editingTextId);
      }
    }
    setEditingTextId(null);
    setTextareaValue('');
  };

  const handleTextDoubleClick = (textId: string) => {
    const textShape = shapesMap.get(textId) as Shape | undefined;
    if (textShape && textShape.type === 'text') {
      setEditingTextId(textId);
      setTextareaValue(textShape.text || '');
      setTextareaPosition({ x: textShape.x, y: textShape.y });
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    // Handle panning
    if (isPanning.current && pos) {
      // Panning will be handled by making the stage draggable
      return;
    }

    if (pos && providerRef.current) {
      const awareness = providerRef.current.awareness;
      awareness.setLocalStateField('x', pos.x);
      awareness.setLocalStateField('y', pos.y);
    }

    // Handle selection box drag
    if (tool === 'select' && isSelecting.current && selectionBox && pos) {
      // Convert to stage coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      setSelectionBox({
        ...selectionBox,
        x2: stagePos.x,
        y2: stagePos.y
      });
    }

    // Handle pencil drawing
    if (tool === 'pencil' && isDrawing.current && currentLineId.current && pos) {
      // Convert to stage coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      const currentLine = shapesMap.get(currentLineId.current) as Shape | undefined;
      if (currentLine && currentLine.points) {
        const newPoints = [...currentLine.points, stagePos.x, stagePos.y];
        const updatedLine: Shape = { ...currentLine, points: newPoints };

        // Throttle updates to Y.js (only every 50ms)
        const now = Date.now();
        if (now - lastUpdateTime.current > 50) {
          shapesMap.set(currentLineId.current, updatedLine);
          lastUpdateTime.current = now;
        } else {
          // Update local state without syncing
          setShapes(prev => {
            const newMap = new Map(prev);
            newMap.set(currentLineId.current!, updatedLine);
            return newMap;
          });
        }
      }
    }
  };

  const handleMouseUp = (e: any) => {
    const stage = e.target?.getStage?.();

    // Stop panning
    if (isPanning.current) {
      isPanning.current = false;
      if (stage) {
        stage.container().style.cursor = 'default';
      }
      return;
    }

    // Handle selection box
    if (tool === 'select' && isSelecting.current && selectionBox) {
      const { x1, y1, x2, y2 } = selectionBox;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      const selected = new Set<string>();

      console.log('Selection box:', { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY });

      // Check each shape if it's within the selection box
      shapes.forEach((shape, id) => {
        let shapeMinX, shapeMaxX, shapeMinY, shapeMaxY;

        if (shape.type === 'rectangle') {
          shapeMinX = shape.x;
          shapeMaxX = shape.x + (shape.width || 0);
          shapeMinY = shape.y;
          shapeMaxY = shape.y + (shape.height || 0);
        } else if (shape.type === 'circle') {
          shapeMinX = shape.x - (shape.radius || 0);
          shapeMaxX = shape.x + (shape.radius || 0);
          shapeMinY = shape.y - (shape.radius || 0);
          shapeMaxY = shape.y + (shape.radius || 0);
        } else if (shape.type === 'text') {
          // Calculate accurate text height based on fontSize and wrapping
          const fontSize = shape.fontSize || 20;
          const width = shape.width || 200;
          const text = shape.text || '';

          // Estimate number of lines based on text length and width
          // This is a rough estimate - actual height depends on font metrics
          const avgCharsPerLine = Math.floor(width / (fontSize * 0.6)); // Rough estimate
          const numLines = text.length > 0 ? Math.max(1, Math.ceil(text.length / avgCharsPerLine)) : 1;
          const lineHeight = fontSize * 1.2; // Standard line height
          const estimatedHeight = numLines * lineHeight;

          shapeMinX = shape.x;
          shapeMaxX = shape.x + width;
          shapeMinY = shape.y;
          shapeMaxY = shape.y + estimatedHeight;
        } else if (shape.type === 'line') {
          // For lines, calculate bounding box from all points
          const points = shape.points || [];
          if (points.length >= 2) {
            const xCoords = points.filter((_, i) => i % 2 === 0).map(p => p + shape.x);
            const yCoords = points.filter((_, i) => i % 2 === 1).map(p => p + shape.y);
            shapeMinX = Math.min(...xCoords);
            shapeMaxX = Math.max(...xCoords);
            shapeMinY = Math.min(...yCoords);
            shapeMaxY = Math.max(...yCoords);
          } else {
            shapeMinX = shape.x;
            shapeMaxX = shape.x;
            shapeMinY = shape.y;
            shapeMaxY = shape.y;
          }
        }

        // Check if shape overlaps with selection box
        const overlaps = shapeMinX !== undefined && shapeMaxX !== undefined && shapeMinY !== undefined && shapeMaxY !== undefined &&
          shapeMinX <= maxX && shapeMaxX >= minX && shapeMinY <= maxY && shapeMaxY >= minY;

        if (overlaps) {
          selected.add(id);
          console.log(`  ✓ Selected ${shape.type} ${id}:`, {
            shapeBounds: { minX: shapeMinX, maxX: shapeMaxX, minY: shapeMinY, maxY: shapeMaxY }
          });
        }
      });

      setSelectedIds(selected);
      setSelectionBox(null);
      isSelecting.current = false;
      console.log(`Selected ${selected.size} shapes total`);
    }

    if (tool === 'pencil' && isDrawing.current && currentLineId.current) {
      // Get the current line
      const currentLine = shapes.get(currentLineId.current);
      if (currentLine && currentLine.points) {
        // Simplify the path to reduce point count and improve performance
        const originalPoints = currentLine.points.length / 2;
        const simplifiedPoints = simplifyPath(currentLine.points, 2);
        const reducedPoints = simplifiedPoints.length / 2;

        console.log(`Path simplified: ${originalPoints} points → ${reducedPoints} points (${Math.round((1 - reducedPoints/originalPoints) * 100)}% reduction)`);

        // Save the simplified path to Y.js
        const simplifiedLine = {
          ...currentLine,
          points: simplifiedPoints
        };
        shapesMap.set(currentLineId.current, simplifiedLine);
      }
      isDrawing.current = false;
      currentLineId.current = null;
    }
  };

  const stageWidth = window.innerWidth;
  const stageHeight = window.innerHeight;

  const buttonBaseStyle: React.CSSProperties = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  };

  const getToolButtonStyle = (isActive: boolean): React.CSSProperties => ({
    ...buttonBaseStyle,
    backgroundColor: isActive ? '#6366F1' : 'white',
    color: isActive ? 'white' : '#374151',
    boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
  });

  const actionButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'white',
    color: '#6B7280',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Tool Selection */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => !isViewer && setTool(tool === 'select' ? null : 'select')}
            style={{
              ...getToolButtonStyle(tool === 'select'),
              opacity: isViewer ? 0.5 : 1,
              cursor: isViewer ? 'not-allowed' : 'pointer'
            }}
            title={isViewer ? "View only - editing disabled" : "Select Tool (V) - Click again to pan"}
            disabled={isViewer}
            onMouseEnter={(e) => {
              if (tool !== 'select' && !isViewer) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== 'select') {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>↖</span>
            <span>Select</span>
          </button>
          <button
            onClick={() => !isViewer && setTool('rectangle')}
            style={{
              ...getToolButtonStyle(tool === 'rectangle'),
              opacity: isViewer ? 0.5 : 1,
              cursor: isViewer ? 'not-allowed' : 'pointer'
            }}
            title={isViewer ? "View only - editing disabled" : "Rectangle Tool (R)"}
            disabled={isViewer}
            onMouseEnter={(e) => {
              if (tool !== 'rectangle') {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== 'rectangle') {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>▭</span>
            <span>Rectangle</span>
          </button>
          <button
            onClick={() => !isViewer && setTool('pencil')}
            style={{
              ...getToolButtonStyle(tool === 'pencil'),
              opacity: isViewer ? 0.5 : 1,
              cursor: isViewer ? 'not-allowed' : 'pointer'
            }}
            title={isViewer ? "View only - editing disabled" : "Pencil Tool (P)"}
            disabled={isViewer}
            onMouseEnter={(e) => {
              if (tool !== 'pencil' && !isViewer) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== 'pencil') {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>✏</span>
            <span>Pencil</span>
          </button>
          <button
            onClick={() => {
              if (isViewer) return;
              setTool('text');
              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              const id = `text-${Date.now()}`;
              setEditingTextId(id);
              setTextareaValue('');
              setTextareaPosition({ x: centerX, y: centerY });
            }}
            style={{
              ...getToolButtonStyle(tool === 'text'),
              opacity: isViewer ? 0.5 : 1,
              cursor: isViewer ? 'not-allowed' : 'pointer'
            }}
            title={isViewer ? "View only - editing disabled" : "Text Tool (T)"}
            disabled={isViewer}
            onMouseEnter={(e) => {
              if (tool !== 'text' && !isViewer) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== 'text') {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>T</span>
            <span>Text</span>
          </button>
        </div>

        {/* Divider */}
        {!isViewer && <div style={{ width: '1px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />}

        {/* Color Picker - Hide for viewers */}
        {!isViewer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Color:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'].map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: color,
                  border: selectedColor === color ? '3px solid #6366F1' : color === '#FFFFFF' ? '2px solid #E5E7EB' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedColor === color ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
                title={color}
              />
            ))}
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '2px solid #E5E7EB',
                cursor: 'pointer',
                padding: '0'
              }}
              title="Custom color"
            />
          </div>
        </div>
        )}

        {/* Divider */}
        {!isViewer && <div style={{ width: '1px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />}

        {/* Undo/Redo */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleUndo}
            style={actionButtonStyle}
            title="Undo (Ctrl+Z)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span style={{ fontSize: '16px' }}>↶</span>
          </button>
          <button
            onClick={handleRedo}
            style={actionButtonStyle}
            title="Redo (Ctrl+Y)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span style={{ fontSize: '16px' }}>↷</span>
          </button>
        </div>
      </div>

      {/* User Info and Share Button */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        gap: '8px'
      }}>
        {workspaceId && workspaceName && (
          <button
            onClick={() => setShareDialogOpen(true)}
            style={{
              ...actionButtonStyle,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            }}
          >
            <span style={{ fontSize: '16px' }}>↗</span>
            <span>Share</span>
          </button>
        )}

        {isEditingName ? (
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingName(false);
              }
            }}
            autoFocus
            style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(10px)',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              border: '2px solid #6366F1',
              outline: 'none',
              width: '200px'
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditingName(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            }}
            title="Click to edit display name"
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
            }} />
            <span style={{ fontWeight: '500' }}>{userName}</span>
            <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '4px' }}>✎</span>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {workspaceId && workspaceName && (
        <ShareDialog
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* Inline text editing - styled to look like direct canvas editing */}
      {editingTextId && (
        <textarea
          ref={textareaRef}
          value={textareaValue}
          onChange={(e) => {
            setTextareaValue(e.target.value);
          }}
          onBlur={handleTextBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              handleTextBlur();
            }
          }}
          placeholder="Type here..."
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            top: textareaPosition.y,
            left: textareaPosition.x,
            fontSize: '20px',
            border: '2px solid #6366F1',
            background: 'white',
            padding: '6px 10px',
            outline: 'none',
            resize: 'both',
            zIndex: 1000,
            width: '200px',
            height: '32px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#1F2937',
            lineHeight: '1.4',
            borderRadius: '6px',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.1)',
            pointerEvents: 'auto',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        />
      )}

      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        draggable={tool === null || (tool === 'select' && !isDrawing.current && !isSelecting.current)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onDragEnd={(e) => {
          const stage = e.target;
          setStagePos({ x: stage.x(), y: stage.y() });
        }}
      >
        {/* Background Layer with Infinite Grid Pattern */}
        <Layer listening={false}>
          {/* Large background rect */}
          <Rect
            x={-50000}
            y={-50000}
            width={100000}
            height={100000}
            fill="#FAFAFA"
          />
          {/* Infinite grid dots - only render visible ones */}
          {(() => {
            const gridSize = 30;
            const dotRadius = 1.5;
            const dots = [];

            // Calculate visible bounds with some padding
            const padding = 1000; // Extra dots beyond viewport
            const minX = Math.floor((-stagePos.x - padding) / gridSize) * gridSize;
            const maxX = Math.ceil((-stagePos.x + stageWidth + padding) / gridSize) * gridSize;
            const minY = Math.floor((-stagePos.y - padding) / gridSize) * gridSize;
            const maxY = Math.ceil((-stagePos.y + stageHeight + padding) / gridSize) * gridSize;

            // Limit the range to prevent too many dots
            const limitedMinX = Math.max(minX, -10000);
            const limitedMaxX = Math.min(maxX, 10000);
            const limitedMinY = Math.max(minY, -10000);
            const limitedMaxY = Math.min(maxY, 10000);

            for (let x = limitedMinX; x <= limitedMaxX; x += gridSize) {
              for (let y = limitedMinY; y <= limitedMaxY; y += gridSize) {
                dots.push(
                  <Circle
                    key={`dot-${x}-${y}`}
                    x={x}
                    y={y}
                    radius={dotRadius}
                    fill="#D1D5DB"
                  />
                );
              }
            }
            return dots;
          })()}
        </Layer>

        {/* Main Content Layer */}
        <Layer>
          {Array.from(shapes.values()).map((shape) => {
            if (shape.type === 'rectangle') {
              return (
                <Rect
                  key={shape.id}
                  ref={(node) => {
                    if (node) {
                      shapeRefs.current.set(shape.id, node);
                    }
                  }}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.color}
                  stroke={selectedIds.has(shape.id) ? '#6366F1' : undefined}
                  strokeWidth={selectedIds.has(shape.id) ? 2 : 0}
                  rotation={shape.rotation || 0}
                  scaleX={shape.scaleX || 1}
                  scaleY={shape.scaleY || 1}
                  draggable={tool === 'select' && canEdit}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'circle') {
              return (
                <Circle
                  key={shape.id}
                  ref={(node) => {
                    if (node) {
                      shapeRefs.current.set(shape.id, node);
                    }
                  }}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  fill={shape.color}
                  stroke={selectedIds.has(shape.id) ? '#6366F1' : undefined}
                  strokeWidth={selectedIds.has(shape.id) ? 2 : 0}
                  rotation={shape.rotation || 0}
                  scaleX={shape.scaleX || 1}
                  scaleY={shape.scaleY || 1}
                  draggable={tool === 'select' && canEdit}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'line') {
              return (
                <Line
                  key={shape.id}
                  ref={(node) => {
                    if (node) {
                      shapeRefs.current.set(shape.id, node);
                    }
                  }}
                  x={shape.x}
                  y={shape.y}
                  points={shape.points || []}
                  stroke={shape.color}
                  strokeWidth={2}
                  hitStrokeWidth={20}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={tool === 'select' && canEdit}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'text') {
              // Don't render text that's being edited
              if (editingTextId === shape.id) {
                return null;
              }
              return (
                <Text
                  key={shape.id}
                  ref={(node) => {
                    if (node) {
                      shapeRefs.current.set(shape.id, node);
                    }
                  }}
                  x={shape.x}
                  y={shape.y}
                  text={shape.text || 'Double-click to edit'}
                  fontSize={shape.fontSize || 20}
                  fill={shape.color}
                  width={shape.width || 200}
                  wrap="word"
                  align="left"
                  stroke={selectedIds.has(shape.id) ? '#6366F1' : undefined}
                  strokeWidth={selectedIds.has(shape.id) ? 1 : 0}
                  shadowColor={selectedIds.has(shape.id) ? '#6366F1' : undefined}
                  shadowBlur={selectedIds.has(shape.id) ? 8 : 0}
                  shadowOpacity={selectedIds.has(shape.id) ? 0.3 : 0}
                  rotation={shape.rotation || 0}
                  scaleX={1}
                  scaleY={1}
                  draggable={tool === 'select' && canEdit}
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDblClick={() => handleTextDoubleClick(shape.id)}
                  onDblTap={() => handleTextDoubleClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                />
              );
            }
            return null;
          })}

          {/* Render remote cursors */}
          {Array.from(remoteCursors.entries()).map(([clientId, cursor]) => (
            <Cursor
              key={clientId}
              x={cursor.x}
              y={cursor.y}
              userName={cursor.user}
              color={generateUserColor(clientId)}
            />
          ))}

          {/* Selection box while dragging */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x2 - selectionBox.x1)}
              height={Math.abs(selectionBox.y2 - selectionBox.y1)}
              fill="rgba(99, 102, 241, 0.08)"
              stroke="#6366F1"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}

          {/* Transformer for shape resizing and moving */}
          {(selectedId || selectedIds.size > 0) && <Transformer ref={transformerRef} />}
        </Layer>
      </Stage>
    </div>
  );
};
