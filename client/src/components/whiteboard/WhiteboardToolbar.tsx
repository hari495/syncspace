import { memo } from 'react';
import type { Tool } from '@/types/whiteboard';
import * as WHITEBOARD from '@/constants/whiteboard';
import { p } from '@/styles/palette';

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

export const WhiteboardToolbar = memo(function WhiteboardToolbar({
  tool, selectedColor, strokeWidth, isViewer,
  onToolChange, onColorChange, onStrokeWidthChange, onUndo, onRedo,
}: WhiteboardToolbarProps) {
  const btn = (active: boolean, disabled = false): React.CSSProperties => ({
    padding: '7px 12px',
    border: active ? `1px solid ${p.accent}` : `1px solid ${p.border}`,
    background: active ? `${p.accent}22` : 'transparent',
    color: active ? p.accent : disabled ? p.dim : p.muted,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontFamily: p.mono,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap' as const,
    transition: 'border-color .15s, color .15s, background .15s',
    opacity: disabled ? 0.4 : 1,
  });

  const divider = <div style={{ width: 1, background: p.border, alignSelf: 'stretch', margin: '0 4px' }} />;

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      gap: 4,
      padding: '8px 12px',
      background: p.bg2,
      border: `1px solid ${p.border2}`,
      alignItems: 'center',
    }}>
      {/* Tools */}
      {[
        { id: 'select',    label: 'Select',    icon: '↖' },
        { id: 'rectangle', label: 'Rect',      icon: '▭' },
        { id: 'circle',    label: 'Circle',    icon: '○' },
        { id: 'line',      label: 'Line',      icon: '╱' },
        { id: 'pencil',    label: 'Pencil',    icon: '✏' },
        { id: 'text',      label: 'Text',      icon: 'T' },
      ].map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => !isViewer && onToolChange(tool === id ? null : id as Tool)}
          style={btn(tool === id, isViewer)}
          title={isViewer ? 'View only' : label}
          disabled={isViewer}
        >
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span>{label}</span>
        </button>
      ))}

      {!isViewer && divider}

      {/* Color palette */}
      {!isViewer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {WHITEBOARD.COLOR_PALETTE.map(color => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              title={color}
              style={{
                width: 22, height: 22,
                background: color,
                border: selectedColor === color ? `2px solid ${p.accent}` : `1px solid ${p.border2}`,
                cursor: 'pointer',
                transition: 'border-color .15s',
                flexShrink: 0,
              }}
            />
          ))}
          <input
            type="color"
            value={selectedColor}
            onChange={e => onColorChange(e.target.value)}
            title="Custom color"
            style={{ width: 22, height: 22, border: `1px solid ${p.border2}`, padding: 0, cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      )}

      {!isViewer && divider}

      {/* Stroke widths */}
      {!isViewer && (
        <div style={{ display: 'flex', gap: 4 }}>
          {WHITEBOARD.STROKE_WIDTHS.map((width, i) => (
            <button
              key={width}
              onClick={() => onStrokeWidthChange(width)}
              style={btn(strokeWidth === width)}
              title={WHITEBOARD.STROKE_WIDTH_LABELS[i]}
            >
              {WHITEBOARD.STROKE_WIDTH_LABELS[i].split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {divider}

      {/* Undo / Redo */}
      <button onClick={onUndo} style={btn(false)} title="Undo (Ctrl+Z)"><span style={{ fontSize: 14 }}>↶</span></button>
      <button onClick={onRedo} style={btn(false)} title="Redo (Ctrl+Y)"><span style={{ fontSize: 14 }}>↷</span></button>
    </div>
  );
});
