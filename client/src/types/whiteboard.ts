export type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'pencil' | 'text' | null;

export interface Shape {
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

export interface CursorState {
  x: number;
  y: number;
  user: string;
}

export interface SelectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
