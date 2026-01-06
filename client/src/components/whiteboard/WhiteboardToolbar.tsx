import { memo } from 'react';
import type { Tool } from '@/types/whiteboard';
import * as WHITEBOARD from '@/constants/whiteboard';

interface WhiteboardToolbarProps {
  tool: Tool;
  selectedColor: string;
  strokeWidth: number;
  isViewer: boolean;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

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

export const WhiteboardToolbar = memo(function WhiteboardToolbar({
  tool,
  selectedColor,
  strokeWidth,
  isViewer,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
}: WhiteboardToolbarProps) {
  return (
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
          onClick={() => !isViewer && onToolChange(tool === 'select' ? null : 'select')}
          style={{
            ...getToolButtonStyle(tool === 'select'),
            opacity: isViewer ? 0.5 : 1,
            cursor: isViewer ? 'not-allowed' : 'pointer'
          }}
          title={isViewer ? "View only - editing disabled" : "Select Tool (V)"}
          disabled={isViewer}
        >
          <span style={{ fontSize: '16px' }}>↖</span>
          <span>Select</span>
        </button>
        <button
          onClick={() => !isViewer && onToolChange('rectangle')}
          style={{
            ...getToolButtonStyle(tool === 'rectangle'),
            opacity: isViewer ? 0.5 : 1,
            cursor: isViewer ? 'not-allowed' : 'pointer'
          }}
          title={isViewer ? "View only - editing disabled" : "Rectangle Tool (R)"}
          disabled={isViewer}
        >
          <span style={{ fontSize: '16px' }}>▭</span>
          <span>Rectangle</span>
        </button>
        <button
          onClick={() => !isViewer && onToolChange('circle')}
          style={{
            ...getToolButtonStyle(tool === 'circle'),
            opacity: isViewer ? 0.5 : 1,
            cursor: isViewer ? 'not-allowed' : 'pointer'
          }}
          title={isViewer ? "View only - editing disabled" : "Circle Tool (C)"}
          disabled={isViewer}
        >
          <span style={{ fontSize: '16px' }}>○</span>
          <span>Circle</span>
        </button>
        <button
          onClick={() => !isViewer && onToolChange('line')}
          style={{
            ...getToolButtonStyle(tool === 'line'),
            opacity: isViewer ? 0.5 : 1,
            cursor: isViewer ? 'not-allowed' : 'pointer'
          }}
          title={isViewer ? "View only - editing disabled" : "Line Tool (L)"}
          disabled={isViewer}
        >
          <span style={{ fontSize: '16px' }}>╱</span>
          <span>Line</span>
        </button>
        <button
          onClick={() => !isViewer && onToolChange('pencil')}
          style={{
            ...getToolButtonStyle(tool === 'pencil'),
            opacity: isViewer ? 0.5 : 1,
            cursor: isViewer ? 'not-allowed' : 'pointer'
          }}
          title={isViewer ? "View only - editing disabled" : "Pencil Tool (P)"}
          disabled={isViewer}
        >
          <span style={{ fontSize: '16px' }}>✏</span>
          <span>Pencil</span>
        </button>
        <button
          onClick={() => !isViewer && onToolChange('text')}
          style={{
            ...getToolButtonStyle(tool === 'text'),
            opacity: isViewer ? 0.5 : 1,
            cursor: isViewer ? 'not-allowed' : 'pointer'
          }}
          title={isViewer ? "View only - editing disabled" : "Text Tool (T)"}
          disabled={isViewer}
        >
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>T</span>
          <span>Text</span>
        </button>
      </div>

      {/* Divider */}
      {!isViewer && <div style={{ width: '1px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />}

      {/* Color Picker */}
      {!isViewer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Color:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {WHITEBOARD.COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
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
              onChange={(e) => onColorChange(e.target.value)}
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

      {/* Stroke Width Selector */}
      {!isViewer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Thickness:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {WHITEBOARD.STROKE_WIDTHS.map((width, index) => (
              <button
                key={width}
                onClick={() => onStrokeWidthChange(width)}
                style={{
                  ...buttonBaseStyle,
                  padding: '6px 12px',
                  backgroundColor: strokeWidth === width ? '#6366F1' : 'white',
                  color: strokeWidth === width ? 'white' : '#374151',
                  boxShadow: strokeWidth === width ? '0 2px 8px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                title={WHITEBOARD.STROKE_WIDTH_LABELS[index]}
              >
                {WHITEBOARD.STROKE_WIDTH_LABELS[index].split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {!isViewer && <div style={{ width: '1px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />}

      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onUndo}
          style={actionButtonStyle}
          title="Undo (Ctrl+Z)"
        >
          <span style={{ fontSize: '16px' }}>↶</span>
        </button>
        <button
          onClick={onRedo}
          style={actionButtonStyle}
          title="Redo (Ctrl+Y)"
        >
          <span style={{ fontSize: '16px' }}>↷</span>
        </button>
      </div>
    </div>
  );
});
