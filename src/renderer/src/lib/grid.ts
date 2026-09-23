export const GRID_STEP = 40

export function snap(v: number, step = GRID_STEP): number {
  return Math.round(v / step) * step
}
