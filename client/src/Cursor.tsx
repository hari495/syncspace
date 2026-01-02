import { Text, Arrow } from 'react-konva';

interface CursorProps {
  x: number;
  y: number;
  userName: string;
  color: string;
}

const Cursor = ({ x, y, userName, color }: CursorProps) => {
  return (
    <>
      <Arrow
        points={[x, y, x + 10, y + 15]}
        pointerLength={5}
        pointerWidth={5}
        fill={color}
        stroke={color}
        strokeWidth={2}
      />
      <Text
        x={x + 15}
        y={y + 5}
        text={userName}
        fontSize={12}
        fill={color}
        fontStyle="bold"
      />
    </>
  );
};

export default Cursor;
