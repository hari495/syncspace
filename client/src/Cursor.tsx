import { Text, Arrow, Rect } from 'react-konva';

interface CursorProps {
  x: number;
  y: number;
  userName: string;
  color: string;
}

const Cursor = ({ x, y, userName, color }: CursorProps) => {
  // Calculate text width (rough estimate)
  const textWidth = userName.length * 7 + 8;
  const textHeight = 20;

  return (
    <>
      {/* Cursor arrow */}
      <Arrow
        points={[x, y, x + 12, y + 16]}
        pointerLength={6}
        pointerWidth={6}
        fill={color}
        stroke="white"
        strokeWidth={1.5}
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={3}
        shadowOffsetX={1}
        shadowOffsetY={1}
      />
      {/* Name tag background */}
      <Rect
        x={x + 18}
        y={y + 8}
        width={textWidth}
        height={textHeight}
        fill={color}
        cornerRadius={4}
        shadowColor="rgba(0, 0, 0, 0.15)"
        shadowBlur={4}
        shadowOffsetY={1}
      />
      {/* Name text */}
      <Text
        x={x + 22}
        y={y + 12}
        text={userName}
        fontSize={12}
        fill="white"
        fontStyle="500"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      />
    </>
  );
};

export default Cursor;
