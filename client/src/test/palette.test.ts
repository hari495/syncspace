import { describe, it, expect } from 'vitest'
import { p } from '@/styles/palette'

describe('palette', () => {
  const hexOrHsl = (v: string) => /^#[0-9a-f]{3,8}$/i.test(v) || /^hsl\(/.test(v)

  it('all color values are valid hex', () => {
    const colors = [p.bg, p.bg2, p.bg3, p.border, p.border2, p.text, p.muted, p.dim, p.accent, p.accentH, p.destroy]
    for (const c of colors) {
      expect(hexOrHsl(c), `"${c}" is not a valid color`).toBe(true)
    }
  })

  it('background is darker than text (not same)', () => {
    expect(p.bg).not.toBe(p.text)
  })

  it('accent and accentH are different (hover distinct)', () => {
    expect(p.accent).not.toBe(p.accentH)
  })

  it('font strings are non-empty', () => {
    expect(p.mono.length).toBeGreaterThan(0)
    expect(p.serif.length).toBeGreaterThan(0)
    expect(p.sans.length).toBeGreaterThan(0)
  })
})
