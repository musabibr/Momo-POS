/**
 * Motion vocabulary — single source of truth for all transitions.
 *
 * Three named curves × four named durations. Components MUST use these tokens
 * instead of inline cubic-bezier strings or magic numbers. ESLint enforces this
 * post-Phase 0.
 *
 * Usage:
 *   import { ease, dur, t } from '@renderer/ds/motion'
 *   transition: t('background', 'fast')                // → 'background 150ms ease'
 *   transition: t('transform', 'base', 'hoverLift')    // → 'transform 180ms cubic-bezier(.34,1.1,.64,1)'
 */

export const ease = {
  /** Hover lift — cards, buttons, item cards rising on hover */
  hoverLift: 'cubic-bezier(.34, 1.1, .64, 1)',
  /** State change — colors, opacity, borders. The default. */
  stateChange: 'ease',
  /** Springy entry — modals, toasts, confirmations. Use sparingly. */
  springyEntry: 'cubic-bezier(.34, 1.56, .64, 1)',
  /** Slide — drawers, navigation, sidebar collapse */
  slide: 'ease-in-out',
} as const

export const dur = {
  /** 150 ms — color/opacity/border state changes */
  fast: 150,
  /** 180 ms — hover lifts, button press */
  base: 180,
  /** 250 ms — modal/toast entry, springy confirmations */
  entry: 250,
  /** 300 ms — sidebar slide, page transitions */
  slide: 300,
} as const

export type Ease = keyof typeof ease
export type Dur = keyof typeof dur

/** Compose a `transition` value from named tokens. */
export function t(prop: string, duration: Dur = 'fast', curve: Ease = 'stateChange'): string {
  return `${prop} ${dur[duration]}ms ${ease[curve]}`
}
