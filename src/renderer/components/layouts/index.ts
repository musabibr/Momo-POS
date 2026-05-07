/**
 * Layout primitives barrel.
 *
 * Always import from `components/layouts` rather than reaching into individual
 * files — keeps a single boundary and lets us reorganize internally.
 */

export { ScrollArea } from './ScrollArea'
export { Page } from './Page'
export { TwoPane, useTwoPaneNarrow } from './TwoPane'
export { ResponsiveTable } from './ResponsiveTable'
export { KpiGrid } from './KpiGrid'
export { CardGrid } from './CardGrid'
export { Pagination } from './Pagination'
export { usePaginated } from './usePaginated'
export type { Paginated } from './usePaginated'
export { ScrollableTabs } from './ScrollableTabs'
