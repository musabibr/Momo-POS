/**
 * Type scale — single source for ALL screens.
 * Each step has a defined size + weight. No inline font-size values outside `ds/`.
 */

export const type = {
  /** Module hero — module name in topbar */
  display: { size: 24, weight: 900 },
  /** Module heading — page H1 */
  title: { size: 20, weight: 900 },
  /** Panel/card heading */
  heading: { size: 17, weight: 800 },
  /** Row title, card title */
  subhead: { size: 14, weight: 700 },
  /** Default body text */
  body: { size: 14, weight: 500 },
  /** Metadata, timestamps, hints */
  caption: { size: 12, weight: 600 },
  /** Uppercase tags, badges, table headers */
  micro: { size: 11, weight: 700 },
} as const

export type TypeStep = keyof typeof type

/** Compose font shorthand from a type step. */
export function font(step: TypeStep) {
  const t = type[step]
  return { fontSize: t.size, fontWeight: t.weight }
}
