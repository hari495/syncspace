import { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Transformer, Line, Text } from 'react-konva';
import Konva from 'konva';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Cursor from './Cursor';

type Tool = 'select' | 'rectangle' | 'pencil' | 'text';

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

const generateRandomName = () => {
  const adjectives = ['Happy', 'Clever', 'Swift', 'Bright', 'Cool', 'Kind'];
  const nouns = ['Panda', 'Fox', 'Eagle', 'Wolf', 'Lion', 'Bear'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
};

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

const Whiteboard = () => {
  const [shapes, setShapes] = useState<Map<string, Shape>>(new Map());
  const [remoteCursors, setRemoteCursors] = useState<Map<number, CursorState>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>('select');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textareaValue, setTextareaValue] = useState('');
  const [textareaPosition, setTextareaPosition] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [ydoc] = useState(() => new Y.Doc());
  const [shapesMap] = useState(() => ydoc.getMap('shapes'));
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [userName] = useState(() => generateRandomName());
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

  useEffect(() => {
    // Connect to the WebSocket server
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      'syncspace-room',
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

    // Initialize with a test shape if the map is empty
    if (shapesMap.size === 0) {
      const testShape: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        color: 'blue'
      };
      shapesMap.set(testShape.id, testShape);
    }

    // Observe changes to the Y.Map and update React state
    const observer = (event: Y.YMapEvent<Shape>) => {
      const newShapes = new Map<string, Shape>();
      shapesMap.forEach((value, key) => {
        newShapes.set(key, value as Shape);
      });
      setShapes(newShapes);
    };

    shapesMap.observe(observer);

    // Initial sync
    observer({} as Y.YMapEvent<Shape>);

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
              const shape = shapesMap.get(id);
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
    const shape = shapesMap.get(shapeId);

    if (shape) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      const updatedShape = {
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
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (pos) {
        isDrawing.current = true;
        const id = `line-${Date.now()}`;
        currentLineId.current = id;

        const newLine: Shape = {
          id,
          type: 'line',
          x: 0,
          y: 0,
          points: [pos.x, pos.y],
          color: 'black'
        };

        shapesMap.set(id, newLine);
        lastUpdateTime.current = Date.now();
      }
    } else if (tool === 'rectangle') {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (pos) {
        const id = `rect-${Date.now()}`;
        const newRect: Shape = {
          id,
          type: 'rectangle',
          x: pos.x,
          y: pos.y,
          width: 100,
          height: 100,
          color: 'blue'
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
        color: 'black'
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
    const textShape = shapesMap.get(textId);
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

    if (pos && providerRef.current) {
      const awareness = providerRef.current.awareness;
      awareness.setLocalStateField('x', pos.x);
      awareness.setLocalStateField('y', pos.y);
    }

    // Handle selection box drag
    if (tool === 'select' && isSelecting.current && selectionBox && pos) {
      setSelectionBox({
        ...selectionBox,
        x2: pos.x,
        y2: pos.y
      });
    }

    // Handle pencil drawing
    if (tool === 'pencil' && isDrawing.current && currentLineId.current && pos) {
      const currentLine = shapesMap.get(currentLineId.current);
      if (currentLine && currentLine.points) {
        const newPoints = [...currentLine.points, pos.x, pos.y];
        const updatedLine = { ...currentLine, points: newPoints };

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

  const handleMouseUp = () => {
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
        const overlaps = shapeMinX !== undefined && shapeMinX <= maxX && shapeMaxX >= minX && shapeMinY <= maxY && shapeMaxY >= minY;

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

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        padding: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        {/* Tool Selection */}
        <button
          onClick={() => setTool('select')}
          style={{
            padding: '8px 16px',
            backgroundColor: tool === 'select' ? '#FF6B6B' : '#f0f0f0',
            color: tool === 'select' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          title="Select Tool"
        >
          ⬜ Select
        </button>
        <button
          onClick={() => setTool('rectangle')}
          style={{
            padding: '8px 16px',
            backgroundColor: tool === 'rectangle' ? '#FF6B6B' : '#f0f0f0',
            color: tool === 'rectangle' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          title="Rectangle Tool"
        >
          ▭ Rectangle
        </button>
        <button
          onClick={() => setTool('pencil')}
          style={{
            padding: '8px 16px',
            backgroundColor: tool === 'pencil' ? '#FF6B6B' : '#f0f0f0',
            color: tool === 'pencil' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          title="Pencil Tool"
        >
          ✎ Pencil
        </button>
        <button
          onClick={() => {
            setTool('text');
            // Immediately create a text box in the center of the screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const id = `text-${Date.now()}`;

            setEditingTextId(id);
            setTextareaValue('');
            setTextareaPosition({ x: centerX, y: centerY });

            console.log('Text tool activated, text box created at center');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: tool === 'text' ? '#FF6B6B' : '#f0f0f0',
            color: tool === 'text' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          title="Text Tool"
        >
          T Text
        </button>

        {/* Divider */}
        <div style={{ width: '1px', backgroundColor: '#ddd', margin: '0 4px' }} />

        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4ECDC4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={handleRedo}
          style={{
            padding: '8px 16px',
            backgroundColor: '#45B7D1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
      </div>

      {/* Inline text editing - styled to look like direct canvas editing */}
      {editingTextId && (
        <>
          {console.log('Rendering textarea for:', editingTextId, 'at position:', textareaPosition)}
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
              // Prevent this click from reaching the Stage
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              top: textareaPosition.y,
              left: textareaPosition.x,
              fontSize: '20px',
              border: '2px solid #3B82F6',
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '4px 6px',
              outline: 'none',
              resize: 'both',
              zIndex: 1000,
              width: '200px',
              height: '32px',
              fontFamily: 'Arial, sans-serif',
              color: 'black',
              lineHeight: '1.2',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'auto',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          />
        </>
      )}

      <Stage
        width={stageWidth}
        height={stageHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
      >
        {/* Background Layer with Grid Pattern */}
        <Layer listening={false}>
          {/* Light gray background */}
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill="#f5f5f5"
          />
          {/* Grid dots */}
          {(() => {
            const gridSize = 25; // Distance between dots
            const dotRadius = 1; // Size of each dot
            const dots = [];

            for (let x = 0; x < stageWidth; x += gridSize) {
              for (let y = 0; y < stageHeight; y += gridSize) {
                dots.push(
                  <Circle
                    key={`dot-${x}-${y}`}
                    x={x}
                    y={y}
                    radius={dotRadius}
                    fill="#d0d0d0"
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
                  stroke={selectedIds.has(shape.id) ? '#3B82F6' : undefined}
                  strokeWidth={selectedIds.has(shape.id) ? 3 : 0}
                  rotation={shape.rotation || 0}
                  scaleX={shape.scaleX || 1}
                  scaleY={shape.scaleY || 1}
                  draggable
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
                  stroke={selectedIds.has(shape.id) ? '#3B82F6' : undefined}
                  strokeWidth={selectedIds.has(shape.id) ? 3 : 0}
                  rotation={shape.rotation || 0}
                  scaleX={shape.scaleX || 1}
                  scaleY={shape.scaleY || 1}
                  draggable
                  onClick={() => handleShapeClick(shape.id)}
                  onTap={() => handleShapeClick(shape.id)}
                  onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'line') {
              const isSelected = selectedIds.has(shape.id);
              return (
                <>
                  {/* Actual line */}
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
                    draggable={tool === 'select'}
                    onClick={() => handleShapeClick(shape.id)}
                    onTap={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  />
                  {/* Selection outline on top */}
                  {isSelected && (
                    <Line
                      key={`${shape.id}-outline`}
                      x={shape.x}
                      y={shape.y}
                      points={shape.points || []}
                      stroke="#3B82F6"
                      strokeWidth={6}
                      opacity={0.5}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      listening={false}
                      dash={[10, 5]}
                    />
                  )}
                </>
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
                  stroke={selectedIds.has(shape.id) ? '#3B82F6' : undefined}
                  strokeWidth={selectedIds.has(shape.id) ? 1 : 0}
                  shadowColor={selectedIds.has(shape.id) ? '#3B82F6' : undefined}
                  shadowBlur={selectedIds.has(shape.id) ? 8 : 0}
                  shadowOpacity={selectedIds.has(shape.id) ? 0.3 : 0}
                  rotation={shape.rotation || 0}
                  scaleX={1}
                  scaleY={1}
                  draggable={tool === 'select'}
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
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3B82F6"
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

export default Whiteboard;
