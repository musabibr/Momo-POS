/**
 * Design system entry point.
 *
 * All design primitives live under `ds/` and are imported via this barrel.
 * Components in `components/`, `screens/`, and `features/` MUST import design
 * tokens through `ds/` — never inline raw hex/px values.
 *
 * After Phase 0, ESLint enforces this rule.
 */

export { P, IC, NAV, navForRole } from '../tokens'
export type { Screen, Role, NavSlot } from '../tokens'
export * from './motion'
export * from './density'
export * from './spacing'
export * from './type'
export * from './breakpoints'
export * from './useViewport'
