export const BRANCHES = ['Beirut', 'Zouk', 'Broummana'] as const

export function emptyStock(): Record<string, number> {
  return Object.fromEntries(BRANCHES.map(b => [b, 0]))
}

// Existing games still have `stock` as a single number — fold that into the
// flagship branch on first edit instead of forcing a one-off DB migration.
export function normalizeStock(stock: unknown): Record<string, number> {
  const result = emptyStock()
  if (typeof stock === 'number') {
    result[BRANCHES[0]] = stock
  } else if (stock && typeof stock === 'object') {
    for (const b of BRANCHES) {
      const v = (stock as Record<string, unknown>)[b]
      if (typeof v === 'number') result[b] = v
    }
  }
  return result
}

export function totalStock(stock: unknown): number {
  if (typeof stock === 'number') return stock
  if (stock && typeof stock === 'object') {
    return Object.values(stock as Record<string, number>)
      .reduce((sum, n) => sum + (Number(n) || 0), 0)
  }
  return 0
}

// Branch ids are just the branch name itself (no separate branches
// collection) — this just normalizes casing and falls back to the raw value
// for anything unrecognized instead of showing blank.
export function resolveBranchName(branchId: string | undefined | null): string {
  if (!branchId) return '—'
  const match = BRANCHES.find(b => b.toLowerCase() === branchId.toLowerCase())
  return match ?? branchId
}
