import { memo } from 'react';
import { Rect, Circle, Line, Text } from 'react-konva';
import Konva from 'konva';

interface BaseShapeProps {
  id: string;
  x: number;
  y: number;
  color: string;
  strokeWidth?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  isSelected: boolean;
  canEdit: boolean;
  tool: string | null;
  onClick: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
  shapeRef: (node: Konva.Shape | null) => void;
}

interface RectangleShapeProps extends BaseShapeProps {
  width?: number;
  height?: number;
}

interface CircleShapeProps extends BaseShapeProps {
  radius?: number;
}

interface LineShapeProps extends BaseShapeProps {
  points?: number[];
}

interface TextShapeProps extends BaseShapeProps {
  text?: string;
  fontSize?: number;
  width?: number;
  onDblClick: () => void;
}

export const MemoizedRectangle = memo(function MemoizedRectangle({
  id,
  x,
  y,
  width,
  height,
  color,
  strokeWidth,
  rotation,
  scaleX,
  scaleY,
  isSelected,
  canEdit,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
  shapeRef,
}: RectangleShapeProps) {
  return (
    <Rect
      key={id}
      ref={shapeRef}
      x={x}
      y={y}
      width={width}
      height={height}
      fill="transparent"
      stroke={isSelected ? '#6366F1' : color}
      strokeWidth={isSelected ? (strokeWidth || 2) + 2 : (strokeWidth || 2)}
      rotation={rotation || 0}
      scaleX={scaleX || 1}
      scaleY={scaleY || 1}
      draggable={tool === 'select' && canEdit}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
});

export const MemoizedCircle = memo(function MemoizedCircle({
  id,
  x,
  y,
  radius,
  color,
  strokeWidth,
  rotation,
  scaleX,
  scaleY,
  isSelected,
  canEdit,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
  shapeRef,
}: CircleShapeProps) {
  return (
    <Circle
      key={id}
      ref={shapeRef}
      x={x}
      y={y}
      radius={radius}
      fill="transparent"
      stroke={isSelected ? '#6366F1' : color}
      strokeWidth={isSelected ? (strokeWidth || 2) + 2 : (strokeWidth || 2)}
      rotation={rotation || 0}
      scaleX={scaleX || 1}
      scaleY={scaleY || 1}
      draggable={tool === 'select' && canEdit}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
});

export const MemoizedLine = memo(function MemoizedLine({
  id,
  x,
  y,
  points,
  color,
  strokeWidth,
  canEdit,
  tool,
  onClick,
  onDragEnd,
  shapeRef,
}: Omit<LineShapeProps, 'onTransformEnd' | 'isSelected'>) {
  return (
    <Line
      key={id}
      ref={shapeRef}
      x={x}
      y={y}
      points={points || []}
      stroke={color}
      strokeWidth={strokeWidth || 2}
      hitStrokeWidth={20}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      draggable={tool === 'select' && canEdit}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
    />
  );
});

export const MemoizedText = memo(function MemoizedText({
  id,
  x,
  y,
  text,
  fontSize,
  width,
  color,
  rotation,
  isSelected,
  canEdit,
  tool,
  onClick,
  onDblClick,
  onDragEnd,
  onTransformEnd,
  shapeRef,
}: TextShapeProps) {
  return (
    <Text
      key={id}
      ref={shapeRef}
      x={x}
      y={y}
      text={text || 'Double-click to edit'}
      fontSize={fontSize || 20}
      fill={color}
      width={width || 200}
      wrap="word"
      align="left"
      stroke={isSelected ? '#6366F1' : undefined}
      strokeWidth={isSelected ? 1 : 0}
      shadowColor={isSelected ? '#6366F1' : undefined}
      shadowBlur={isSelected ? 8 : 0}
      shadowOpacity={isSelected ? 0.3 : 0}
      rotation={rotation || 0}
      scaleX={1}
      scaleY={1}
      draggable={tool === 'select' && canEdit}
      onClick={onClick}
      onTap={onClick}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
});
