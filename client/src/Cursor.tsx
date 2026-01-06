import { useState, useEffect, useRef } from 'react';
import { Text, Arrow, Rect } from 'react-konva';

interface CursorProps {
  x: number;
  y: number;
  userName: string;
  color: string;
}

const Cursor = ({ x, y, userName, color }: CursorProps) => {
  const [currentPos, setCurrentPos] = useState({ x, y });
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      setCurrentPos(prev => {
        const dx = x - prev.x;
        const dy = y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.5) {
          return { x, y };
        }

        const smoothing = 0.2;
        return {
          x: prev.x + dx * smoothing,
          y: prev.y + dy * smoothing
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [x, y]);

  const textWidth = userName.length * 7 + 8;
  const textHeight = 20;

  return (
    <>
      <Arrow
        points={[currentPos.x, currentPos.y, currentPos.x + 12, currentPos.y + 16]}
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
      <Rect
        x={currentPos.x + 18}
        y={currentPos.y + 8}
        width={textWidth}
        height={textHeight}
        fill={color}
        cornerRadius={4}
        shadowColor="rgba(0, 0, 0, 0.15)"
        shadowBlur={4}
        shadowOffsetY={1}
      />
      <Text
        x={currentPos.x + 22}
        y={currentPos.y + 12}
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
