/**
 * Density mode — mouse-only in v1.
 *
 * Hit targets, gutters, and input padding standardized for desktop/mouse use.
 * Touch density can be added later by introducing a runtime mode + media query
 * (`(pointer: coarse)`); the surface API stays the same so consumers don't change.
 */

export const density = {
  /** Minimum hit target size (button/icon-button height). */
  hitTarget: 32,
  /** Gutter between adjacent inline controls. */
  gutter: 8,
  /** Input padding (vertical / horizontal). */
  inputPadY: 9,
  inputPadX: 13,
  /** Standard control border width. */
  borderWidth: 1.5,
  /** Compact button padding by size. */
  btnPad: {
    sm: '6px 14px',
    md: '10px 20px',
    lg: '13px 28px',
  },
  /** Icon-button square size by use. */
  iconBtn: {
    sm: 24,
    md: 32,
    lg: 40,
  },
} as const

export type Density = typeof density
