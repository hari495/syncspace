/**
 * Whiteboard Constants
 * Centralized configuration for the whiteboard component
 */

// Grid Configuration
export const GRID_SIZE = 30;
export const GRID_DOT_RADIUS = 1.5;
export const GRID_DOT_COLOR = '#D1D5DB';
export const GRID_PADDING = 1000;
export const GRID_MAX_EXTENT = 10000;

// Canvas Configuration
export const CANVAS_BACKGROUND_COLOR = '#FAFAFA';
export const CANVAS_BACKGROUND_SIZE = 100000;

// Update Throttling (milliseconds)
export const CURSOR_UPDATE_THROTTLE = 100;
export const DRAWING_UPDATE_THROTTLE = 50;

// Shape Defaults
export const DEFAULT_RECTANGLE_SIZE = 100;
export const DEFAULT_CIRCLE_RADIUS = 50;
export const DEFAULT_TEXT_FONT_SIZE = 20;
export const DEFAULT_TEXT_WIDTH = 200;
export const DEFAULT_TEXT_HEIGHT = 32;
export const DEFAULT_LINE_HEIGHT = 1.2;
export const MIN_SHAPE_SIZE = 5;
export const MIN_TEXT_WIDTH = 50;

// Path Simplification
export const PATH_SIMPLIFICATION_TOLERANCE = 2;
export const MIN_POINTS_FOR_SIMPLIFICATION = 4;

// Keyboard Movement
export const ARROW_KEY_MOVE_AMOUNT = 10;

// User Colors for Cursors
export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2'
];

// Selection Box
export const SELECTION_BOX_FILL = 'rgba(99, 102, 241, 0.08)';
export const SELECTION_BOX_STROKE = '#6366F1';
export const SELECTION_BOX_STROKE_WIDTH = 2;
export const SELECTION_BOX_DASH = [5, 5];

// Default Color Palette
export const COLOR_PALETTE = [
  '#000000', // Black
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF'  // White
];

// Timing
export const TEXTAREA_FOCUS_DELAY = 10;
export const TEXT_CREATION_DELAY = 10;

// Text Estimation (for selection bounds)
export const TEXT_CHAR_WIDTH_RATIO = 0.6;
