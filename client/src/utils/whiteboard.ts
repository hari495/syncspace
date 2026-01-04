import * as WHITEBOARD from '@/constants/whiteboard';

/**
 * Generate a consistent color for a user based on their client ID
 */
export function generateUserColor(userId: number): string {
  return WHITEBOARD.USER_COLORS[userId % WHITEBOARD.USER_COLORS.length];
}

/**
 * Ramer-Douglas-Peucker algorithm for line simplification
 * Reduces the number of points in a path while maintaining its shape
 */
export function simplifyPath(points: number[], tolerance: number = WHITEBOARD.PATH_SIMPLIFICATION_TOLERANCE): number[] {
  if (points.length <= WHITEBOARD.MIN_POINTS_FOR_SIMPLIFICATION) return points;

  const sqTolerance = tolerance * tolerance;

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
  const simplified = [points[0], points[1]];
  simplifyDouglasPeucker(points, 0, numPoints - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 2], points[points.length - 1]);

  return simplified;
}
