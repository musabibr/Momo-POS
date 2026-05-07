/**
 * Responsive breakpoint tokens.
 *
 * Aligned to the deployment reality: POS counter devices range from
 * 1024×600 small touchscreens up to 1920×1080 desktops. The breakpoints
 * below match the actual device classes the user has in the wild.
 *
 *   sm   <  640    — emergency small (phones, sanity-only target)
 *   md   <  900    — small POS touchscreens (1024×600 falls here visually
 *                    after sidebar; treated as "narrow")
 *   lg   <  1280   — standard low-end laptops (1366×768)
 *   xl   >= 1280   — full desktop (1920×1080)
 *
 * Use the `mq` strings inline in styles or the `useViewport` hook for
 * conditional logic.
 */

export const bp = {
  sm: 640,
  md: 900,
  lg: 1280,
  xl: 1600,
} as const

export type Bp = keyof typeof bp

export const mq = {
  smDown: '@media (max-width: 639px)',
  mdDown: '@media (max-width: 899px)',
  lgDown: '@media (max-width: 1279px)',
  smUp: '@media (min-width: 640px)',
  mdUp: '@media (min-width: 900px)',
  lgUp: '@media (min-width: 1280px)',
  /** Short viewport (height < 700) — common on 1024×600, 1280×720 devices. */
  short: '@media (max-height: 699px)',
} as const

export type Mq = keyof typeof mq
