export function naturalSort(arr: string[]): string[] {
  return [...arr].sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })
}

export function naturalSortBy<T>(arr: T[], key: (item: T) => string): T[] {
  return [...arr].sort((a, b) => {
    const aVal = key(a)
    const bVal = key(b)
    return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
  })
}
