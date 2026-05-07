/**
 * Spacing scale — 4px base. ALL component margins, paddings, and gaps must
 * snap to this scale. Inline numeric pixel values for spacing are forbidden
 * by ESLint after Phase 0; use `space.m` etc. instead.
 */

export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export type Space = keyof typeof space
