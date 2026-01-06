import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Transformer } from 'react-konva';
import Konva from 'konva';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Cursor from './Cursor';
import { ShareDialog } from './components/workspace/ShareDialog';
import { supabase } from './config/supabase';
import { MemoizedRectangle, MemoizedCircle, MemoizedLine, MemoizedText } from './components/whiteboard/MemoizedShapes';
import * as WHITEBOARD from './constants/whiteboard';

type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'pencil' | 'text' | null;

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
  strokeWidth?: number;
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
  return WHITEBOARD.USER_COLORS[userId % WHITEBOARD.USER_COLORS.length];
};

// Helper functions for color conversion
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Ramer-Douglas-Peucker algorithm for line simplification
const simplifyPath = (points: number[], tolerance: number = WHITEBOARD.PATH_SIMPLIFICATION_TOLERANCE): number[] => {
  if (points.length <= WHITEBOARD.MIN_POINTS_FOR_SIMPLIFICATION) return points;

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
  const [strokeWidth, setStrokeWidth] = useState(WHITEBOARD.DEFAULT_STROKE_WIDTH);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'circle'>('rectangle');
  const [showColorPicker, setShowColorPicker] = useState(false);
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
  const lastCursorUpdateTime = useRef(0);
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

        if (profile && (profile as any).full_name) {
          setUserName((profile as any).full_name);
        } else {
          // Fallback to auth metadata
          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
          setUserName(name);
        }
      }
    };

    getUserName();
  }, []);

  // Update awareness when userName changes
  useEffect(() => {
    if (providerRef.current && userName) {
      const awareness = providerRef.current.awareness;
      awareness.setLocalStateField('user', userName);
    }
  }, [userName]);

  useEffect(() => {
    // Connect to the WebSocket server
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:1234';
    const provider = new WebsocketProvider(
      wsUrl,
      roomName,
      ydoc
    );

    providerRef.current = provider;

    provider.on('status', () => {
      // WebSocket connected
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
    // Optimized: Extract changes synchronously, then update state
    const observer = (event: Y.YMapEvent<any>) => {
      // Must extract changes synchronously before they expire
      const changedKeys = new Map<string, { action: 'delete' | 'add' | 'update'; value?: any }>();
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'delete') {
          changedKeys.set(key, { action: 'delete' });
        } else if (change.action === 'add' || change.action === 'update') {
          const value = shapesMap.get(key);
          changedKeys.set(key, { action: change.action, value });
        }
      });

      // Now update state with extracted changes
      setShapes(prevShapes => {
        const newShapes = new Map(prevShapes);
        changedKeys.forEach((change, key) => {
          if (change.action === 'delete') {
            newShapes.delete(key);
          } else if (change.value) {
            newShapes.set(key, change.value as Shape);
          }
        });
        return newShapes;
      });
    };

    shapesMap.observe(observer);

    // Initial sync - load all shapes
    const initialSync = () => {
      const newShapes = new Map<string, Shape>();
      shapesMap.forEach((value, key) => {
        newShapes.set(key, value as Shape);
      });
      setShapes(newShapes);
    };
    initialSync();

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

        let dx = 0, dy = 0;

        if (e.key === 'ArrowUp') dy = -WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;
        if (e.key === 'ArrowDown') dy = WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;
        if (e.key === 'ArrowLeft') dx = -WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;
        if (e.key === 'ArrowRight') dx = WHITEBOARD.ARROW_KEY_MOVE_AMOUNT;

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
      setTimeout(() => {
        textarea.focus();
        textarea.select();
      }, WHITEBOARD.TEXTAREA_FOCUS_DELAY);
    }
  }, [editingTextId]);

  const handleShapeClick = useCallback((shapeId: string) => {
    setSelectedId(shapeId);
  }, []);

  const handleStageClick = useCallback((e: any) => {
    // Deselect when clicking on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (undoManagerRef.current && undoManagerRef.current.canUndo()) {
      undoManagerRef.current.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (undoManagerRef.current && undoManagerRef.current.canRedo()) {
      undoManagerRef.current.redo();
    }
  }, []);

  const handleTransformEnd = useCallback((shapeId: string, e: any) => {
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
        updatedShape.width = Math.max(WHITEBOARD.MIN_SHAPE_SIZE, node.width() * scaleX);
        updatedShape.height = Math.max(WHITEBOARD.MIN_SHAPE_SIZE, node.height() * scaleY);
        updatedShape.scaleX = 1;
        updatedShape.scaleY = 1;

        // Reset the node's scale immediately
        node.scaleX(1);
        node.scaleY(1);
        node.width(updatedShape.width);
        node.height(updatedShape.height);
      } else if (shape.type === 'circle') {
        updatedShape.radius = Math.max(WHITEBOARD.MIN_SHAPE_SIZE, (shape.radius || WHITEBOARD.DEFAULT_CIRCLE_RADIUS) * scaleX);
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
        const newWidth = Math.max(WHITEBOARD.MIN_TEXT_WIDTH, node.width() * scaleX);
        updatedShape.width = newWidth;
        updatedShape.scaleX = 1;
        updatedShape.scaleY = 1;

        // Reset the node's scale immediately
        node.scaleX(1);
        node.scaleY(1);
        node.width(newWidth);
      }

      shapesMap.set(shapeId, updatedShape);
    }
  }, [shapesMap]);

  const handleDragEnd = useCallback((shapeId: string, e: any) => {
    const shape = shapesMap.get(shapeId);
    if (shape) {
      const updatedShape = {
        ...shape,
        x: e.target.x(),
        y: e.target.y()
      };
      shapesMap.set(shapeId, updatedShape);
    }
  }, [shapesMap]);

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
          color: selectedColor,
          strokeWidth: strokeWidth
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
          width: WHITEBOARD.DEFAULT_RECTANGLE_SIZE,
          height: WHITEBOARD.DEFAULT_RECTANGLE_SIZE,
          color: selectedColor,
          strokeWidth: strokeWidth
        };
        shapesMap.set(id, newRect);
      }
    } else if (tool === 'circle') {
      const pos = stage.getPointerPosition();
      if (pos) {
        // Convert to stage coordinates
        const transform = stage.getAbsoluteTransform().copy().invert();
        const stagePos = transform.point(pos);

        const id = `circle-${Date.now()}`;
        const newCircle: Shape = {
          id,
          type: 'circle',
          x: stagePos.x,
          y: stagePos.y,
          radius: WHITEBOARD.DEFAULT_CIRCLE_RADIUS,
          color: selectedColor,
          strokeWidth: strokeWidth
        };
        shapesMap.set(id, newCircle);
      }
    } else if (tool === 'line') {
      // Prevent creating multiple lines if already drawing
      if (isDrawing.current) return;

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
          points: [stagePos.x, stagePos.y, stagePos.x, stagePos.y],
          color: selectedColor,
          strokeWidth: strokeWidth
        };
        shapesMap.set(id, newLine);
      }
    } else if (tool === 'text') {
      // If currently editing, finish that first
      if (editingTextId) {
        handleTextBlur();
        setTimeout(() => {
          createNewText(e);
        }, WHITEBOARD.TEXT_CREATION_DELAY);
      } else {
        createNewText(e);
      }
    }
  };

  const createNewText = (e: any) => {
    // Only create text if clicking on empty space, not on existing shapes
    const clickedOnShape = e.target.attrs && e.target.attrs.id;
    if (clickedOnShape) {
      return;
    }

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (pos) {
      const id = `text-${Date.now()}`;

      setEditingTextId(id);
      setTextareaValue('');
      setTextareaPosition({ x: pos.x, y: pos.y });
    }
  };


  const handleTextBlur = useCallback(() => {
    if (editingTextId && textareaValue.trim()) {
      // Only save if there's actual text content
      const newText: Shape = {
        id: editingTextId,
        type: 'text',
        x: textareaPosition.x,
        y: textareaPosition.y,
        text: textareaValue,
        fontSize: WHITEBOARD.DEFAULT_TEXT_FONT_SIZE,
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
  }, [editingTextId, textareaValue, textareaPosition, selectedColor, shapesMap]);

  const handleTextDoubleClick = useCallback((textId: string) => {
    const textShape = shapesMap.get(textId) as Shape | undefined;
    if (textShape && textShape.type === 'text') {
      setEditingTextId(textId);
      setTextareaValue(textShape.text || '');
      setTextareaPosition({ x: textShape.x, y: textShape.y });
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [shapesMap]);

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    // Handle panning
    if (isPanning.current && pos) {
      // Panning will be handled by making the stage draggable
      return;
    }

    // Throttle cursor updates
    if (pos && providerRef.current) {
      const now = Date.now();
      if (now - lastCursorUpdateTime.current > WHITEBOARD.CURSOR_UPDATE_THROTTLE) {
        const awareness = providerRef.current.awareness;
        awareness.setLocalStateField('x', pos.x);
        awareness.setLocalStateField('y', pos.y);
        lastCursorUpdateTime.current = now;
      }
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

        // Throttle updates to Y.js
        const now = Date.now();
        if (now - lastUpdateTime.current > WHITEBOARD.DRAWING_UPDATE_THROTTLE) {
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

    // Handle line tool drawing
    if (tool === 'line' && isDrawing.current && currentLineId.current && pos) {
      // Convert to stage coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      const currentLine = shapesMap.get(currentLineId.current) as Shape | undefined;
      if (currentLine && currentLine.points && currentLine.points.length >= 2) {
        // Update only the end point (keep start point, update end point)
        const updatedLine: Shape = {
          ...currentLine,
          points: [currentLine.points[0], currentLine.points[1], stagePos.x, stagePos.y]
        };

        // Update local state immediately for smooth rendering
        setShapes(prev => {
          const newMap = new Map(prev);
          newMap.set(currentLineId.current!, updatedLine);
          return newMap;
        });

        // Also update Y.js (throttled)
        const now = Date.now();
        if (now - lastUpdateTime.current > WHITEBOARD.DRAWING_UPDATE_THROTTLE) {
          shapesMap.set(currentLineId.current, updatedLine);
          lastUpdateTime.current = now;
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
          const fontSize = shape.fontSize || WHITEBOARD.DEFAULT_TEXT_FONT_SIZE;
          const width = shape.width || WHITEBOARD.DEFAULT_TEXT_WIDTH;
          const text = shape.text || '';

          // Estimate number of lines based on text length and width
          const avgCharsPerLine = Math.floor(width / (fontSize * WHITEBOARD.TEXT_CHAR_WIDTH_RATIO));
          const numLines = text.length > 0 ? Math.max(1, Math.ceil(text.length / avgCharsPerLine)) : 1;
          const lineHeight = fontSize * WHITEBOARD.DEFAULT_LINE_HEIGHT;
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
        }
      });

      setSelectedIds(selected);
      setSelectionBox(null);
      isSelecting.current = false;
    }

    if (tool === 'pencil' && isDrawing.current && currentLineId.current) {
      // Get the current line
      const currentLine = shapes.get(currentLineId.current);
      if (currentLine && currentLine.points) {
        // Simplify the path to reduce point count and improve performance
        const simplifiedPoints = simplifyPath(currentLine.points, WHITEBOARD.PATH_SIMPLIFICATION_TOLERANCE);

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

    if (tool === 'line' && isDrawing.current && currentLineId.current) {
      // Finalize the line - save it to Y.js
      const currentLine = shapes.get(currentLineId.current);
      if (currentLine && currentLine.points) {
        shapesMap.set(currentLineId.current, currentLine);
      }
      isDrawing.current = false;
      currentLineId.current = null;
    }
  };

  const stageWidth = window.innerWidth;
  const stageHeight = window.innerHeight;

  // Memoize grid rendering to prevent recalculation on every render
  const gridDots = useMemo(() => {
    const dots = [];

    // Calculate visible bounds with some padding
    const minX = Math.floor((-stagePos.x - WHITEBOARD.GRID_PADDING) / WHITEBOARD.GRID_SIZE) * WHITEBOARD.GRID_SIZE;
    const maxX = Math.ceil((-stagePos.x + stageWidth + WHITEBOARD.GRID_PADDING) / WHITEBOARD.GRID_SIZE) * WHITEBOARD.GRID_SIZE;
    const minY = Math.floor((-stagePos.y - WHITEBOARD.GRID_PADDING) / WHITEBOARD.GRID_SIZE) * WHITEBOARD.GRID_SIZE;
    const maxY = Math.ceil((-stagePos.y + stageHeight + WHITEBOARD.GRID_PADDING) / WHITEBOARD.GRID_SIZE) * WHITEBOARD.GRID_SIZE;

    // Limit the range to prevent too many dots
    const limitedMinX = Math.max(minX, -WHITEBOARD.GRID_MAX_EXTENT);
    const limitedMaxX = Math.min(maxX, WHITEBOARD.GRID_MAX_EXTENT);
    const limitedMinY = Math.max(minY, -WHITEBOARD.GRID_MAX_EXTENT);
    const limitedMaxY = Math.min(maxY, WHITEBOARD.GRID_MAX_EXTENT);

    for (let x = limitedMinX; x <= limitedMaxX; x += WHITEBOARD.GRID_SIZE) {
      for (let y = limitedMinY; y <= limitedMaxY; y += WHITEBOARD.GRID_SIZE) {
        dots.push(
          <Circle
            key={`dot-${x}-${y}`}
            x={x}
            y={y}
            radius={WHITEBOARD.GRID_DOT_RADIUS}
            fill={WHITEBOARD.GRID_DOT_COLOR}
          />
        );
      }
    }
    return dots;
  }, [stagePos.x, stagePos.y, stageWidth, stageHeight]);

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
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                if (!isViewer) {
                  setShowShapeMenu(!showShapeMenu);
                  if (!showShapeMenu) {
                    setTool(selectedShape);
                  }
                }
              }}
              style={{
                ...getToolButtonStyle(tool === 'rectangle' || tool === 'circle'),
                opacity: isViewer ? 0.5 : 1,
                cursor: isViewer ? 'not-allowed' : 'pointer'
              }}
              title={isViewer ? "View only - editing disabled" : "Shapes Tool"}
              disabled={isViewer}
              onMouseEnter={(e) => {
                if (tool !== 'rectangle' && tool !== 'circle' && !isViewer) {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (tool !== 'rectangle' && tool !== 'circle') {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{selectedShape === 'rectangle' ? '▭' : '○'}</span>
              <span>Shapes</span>
              <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
            </button>
            {showShapeMenu && !isViewer && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '4px',
                zIndex: 1001,
                minWidth: '120px'
              }}>
                <button
                  onClick={() => {
                    setSelectedShape('rectangle');
                    setTool('rectangle');
                    setShowShapeMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: selectedShape === 'rectangle' ? '#F3F4F6' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#374151',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = selectedShape === 'rectangle' ? '#F3F4F6' : 'transparent';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>▭</span>
                  <span>Rectangle</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedShape('circle');
                    setTool('circle');
                    setShowShapeMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: selectedShape === 'circle' ? '#F3F4F6' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#374151',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = selectedShape === 'circle' ? '#F3F4F6' : 'transparent';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>○</span>
                  <span>Circle</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => !isViewer && setTool('line')}
            style={{
              ...getToolButtonStyle(tool === 'line'),
              opacity: isViewer ? 0.5 : 1,
              cursor: isViewer ? 'not-allowed' : 'pointer'
            }}
            title={isViewer ? "View only - editing disabled" : "Line Tool (L)"}
            disabled={isViewer}
            onMouseEnter={(e) => {
              if (tool !== 'line' && !isViewer) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== 'line') {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>╱</span>
            <span>Line</span>
          </button>
          <div style={{ position: 'relative' }}>
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
            {tool === 'pencil' && !isViewer && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '12px 16px',
                zIndex: 1001,
                minWidth: '180px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#6B7280',
                  fontWeight: '500'
                }}>
                  <span>Thickness</span>
                  <span style={{ color: '#374151', fontWeight: '600' }}>{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #6366F1 0%, #6366F1 ${((strokeWidth - 1) / 19) * 100}%, #E5E7EB ${((strokeWidth - 1) / 19) * 100}%, #E5E7EB 100%)`,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                />
                <style>{`
                  input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #6366F1;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #6366F1;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                `}</style>
              </div>
            )}
          </div>
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
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{
                ...buttonBaseStyle,
                padding: '10px 16px',
                backgroundColor: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: selectedColor,
                border: '2px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }} />
              <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Color</span>
              <span style={{ fontSize: '10px', marginLeft: '2px', color: '#6B7280' }}>▼</span>
            </button>
            {showColorPicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '16px',
                zIndex: 1001,
                minWidth: '280px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', marginBottom: '8px' }}>
                    Color Picker
                  </div>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '120px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      padding: '0'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', marginBottom: '8px' }}>
                    RGB Values
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {['r', 'g', 'b'].map((channel) => {
                      const rgb = hexToRgb(selectedColor);
                      const value = rgb[channel as keyof typeof rgb];
                      return (
                        <div key={channel} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                            {channel}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={value}
                            onChange={(e) => {
                              const newValue = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                              const newRgb = { ...rgb, [channel]: newValue };
                              setSelectedColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                            }}
                            style={{
                              padding: '6px 8px',
                              border: '1px solid #E5E7EB',
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none',
                              textAlign: 'center'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', marginBottom: '8px' }}>
                    Quick Colors
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {WHITEBOARD.COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: '100%',
                          height: '32px',
                          borderRadius: '4px',
                          backgroundColor: color,
                          border: selectedColor === color ? '2px solid #6366F1' : color === '#FFFFFF' ? '2px solid #E5E7EB' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
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
            fontSize: `${WHITEBOARD.DEFAULT_TEXT_FONT_SIZE}px`,
            border: '2px solid #6366F1',
            background: 'white',
            padding: '6px 10px',
            outline: 'none',
            resize: 'both',
            zIndex: 1000,
            width: `${WHITEBOARD.DEFAULT_TEXT_WIDTH}px`,
            height: `${WHITEBOARD.DEFAULT_TEXT_HEIGHT}px`,
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
            x={-WHITEBOARD.CANVAS_BACKGROUND_SIZE / 2}
            y={-WHITEBOARD.CANVAS_BACKGROUND_SIZE / 2}
            width={WHITEBOARD.CANVAS_BACKGROUND_SIZE}
            height={WHITEBOARD.CANVAS_BACKGROUND_SIZE}
            fill={WHITEBOARD.CANVAS_BACKGROUND_COLOR}
          />
          {/* Infinite grid dots - only render visible ones (memoized) */}
          {gridDots}
        </Layer>

        {/* Main Content Layer */}
        <Layer>
          {Array.from(shapes.values()).map((shape) => {
            const isSelected = selectedIds.has(shape.id);
            const shapeRef = (node: Konva.Shape | null) => {
              if (node) {
                shapeRefs.current.set(shape.id, node);
              }
            };

            if (shape.type === 'rectangle') {
              return (
                <MemoizedRectangle
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  color={shape.color}
                  strokeWidth={shape.strokeWidth}
                  rotation={shape.rotation}
                  scaleX={shape.scaleX}
                  scaleY={shape.scaleY}
                  isSelected={isSelected}
                  canEdit={canEdit}
                  tool={tool}
                  onClick={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                  shapeRef={shapeRef}
                />
              );
            } else if (shape.type === 'circle') {
              return (
                <MemoizedCircle
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  color={shape.color}
                  strokeWidth={shape.strokeWidth}
                  rotation={shape.rotation}
                  scaleX={shape.scaleX}
                  scaleY={shape.scaleY}
                  isSelected={isSelected}
                  canEdit={canEdit}
                  tool={tool}
                  onClick={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                  shapeRef={shapeRef}
                />
              );
            } else if (shape.type === 'line') {
              return (
                <MemoizedLine
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  points={shape.points}
                  color={shape.color}
                  strokeWidth={shape.strokeWidth}
                  rotation={shape.rotation}
                  scaleX={shape.scaleX}
                  scaleY={shape.scaleY}
                  canEdit={canEdit}
                  tool={tool}
                  onClick={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  shapeRef={shapeRef}
                />
              );
            } else if (shape.type === 'text') {
              // Don't render text that's being edited
              if (editingTextId === shape.id) {
                return null;
              }
              return (
                <MemoizedText
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  text={shape.text}
                  fontSize={shape.fontSize}
                  width={shape.width}
                  color={shape.color}
                  rotation={shape.rotation}
                  isSelected={isSelected}
                  canEdit={canEdit}
                  tool={tool}
                  onClick={() => handleShapeClick(shape.id)}
                  onDblClick={() => handleTextDoubleClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                  shapeRef={shapeRef}
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
              fill={WHITEBOARD.SELECTION_BOX_FILL}
              stroke={WHITEBOARD.SELECTION_BOX_STROKE}
              strokeWidth={WHITEBOARD.SELECTION_BOX_STROKE_WIDTH}
              dash={WHITEBOARD.SELECTION_BOX_DASH}
            />
          )}

          {/* Transformer for shape resizing and moving */}
          {(selectedId || selectedIds.size > 0) && <Transformer ref={transformerRef} />}
        </Layer>
      </Stage>
    </div>
  );
};
