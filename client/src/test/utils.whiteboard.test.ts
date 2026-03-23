import { describe, it, expect } from 'vitest'
import { generateUserColor, simplifyPath } from '@/utils/whiteboard'
import * as WHITEBOARD from '@/constants/whiteboard'

describe('generateUserColor', () => {
  it('returns a color string', () => {
    const color = generateUserColor(0)
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })

  it('cycles through USER_COLORS array', () => {
    const len = WHITEBOARD.USER_COLORS.length
    for (let i = 0; i < len * 2; i++) {
      expect(generateUserColor(i)).toBe(WHITEBOARD.USER_COLORS[i % len])
    }
  })

  it('handles large user IDs', () => {
    expect(() => generateUserColor(9999)).not.toThrow()
  })
})

describe('simplifyPath', () => {
  it('returns original path when point count is below threshold', () => {
    const short = [0, 0, 1, 1]
    expect(simplifyPath(short)).toEqual(short)
  })

  it('returns an array of numbers', () => {
    const pts = Array.from({ length: 20 }, (_, i) => i)
    const result = simplifyPath(pts)
    expect(Array.isArray(result)).toBe(true)
    expect(result.every(n => typeof n === 'number')).toBe(true)
  })

  it('always keeps start and end points', () => {
    const pts = [0, 0, 5, 100, 10, 5, 15, 100, 20, 0, 25, 100, 30, 0]
    const result = simplifyPath(pts)
    expect(result[0]).toBe(pts[0])
    expect(result[1]).toBe(pts[1])
    expect(result[result.length - 2]).toBe(pts[pts.length - 2])
    expect(result[result.length - 1]).toBe(pts[pts.length - 1])
  })

  it('reduces points for a near-collinear path', () => {
    // Straight line with slight wobble — should simplify aggressively
    const pts = [0, 0, 10, 0.1, 20, 0, 30, 0.1, 40, 0, 50, 0.1, 60, 0]
    const result = simplifyPath(pts, 1)
    expect(result.length).toBeLessThan(pts.length)
  })

  it('preserves all points for a highly irregular path', () => {
    // Points with large deviations should not be reduced much
    const pts = [0, 0, 5, 100, 10, -100, 15, 200, 20, -200, 25, 0]
    const result = simplifyPath(pts, 0.1)
    expect(result.length).toBeGreaterThanOrEqual(4)
  })

  it('accepts custom tolerance', () => {
    const pts = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? i * 5 : Math.sin(i) * 2))
    const tight = simplifyPath(pts, 0.1)
    const loose = simplifyPath(pts, 50)
    expect(loose.length).toBeLessThanOrEqual(tight.length)
  })
})
