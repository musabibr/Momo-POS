import { useEffect, useState } from 'react'
import { bp, type Bp } from './breakpoints'

/** Reactively observe the current viewport size and breakpoint class. */
export interface ViewportInfo {
  w: number
  h: number
  /** Active breakpoint class. `sm` < 640, `md` < 900, `lg` < 1280, `xl` >= 1280. */
  bp: Bp
  /** True when viewport is narrower than the `md` threshold (900px). */
  isNarrow: boolean
  /** True when viewport is shorter than 700px — relevant for 1024×600 touchscreens. */
  isShort: boolean
}

function compute(): ViewportInfo {
  if (typeof window === 'undefined') {
    return { w: 1280, h: 720, bp: 'lg', isNarrow: false, isShort: false }
  }
  const w = window.innerWidth
  const h = window.innerHeight
  const cls: Bp = w < bp.sm ? 'sm' : w < bp.md ? 'md' : w < bp.lg ? 'lg' : 'xl'
  return {
    w,
    h,
    bp: cls,
    isNarrow: w < bp.md,
    isShort: h < 700,
  }
}

export function useViewport(): ViewportInfo {
  const [v, setV] = useState<ViewportInfo>(compute)
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setV(compute()))
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return v
}
