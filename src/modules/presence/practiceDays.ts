export function countPresenceDays(history: { date: string }[]): number {
  const days = new Set<string>()
  for (const item of history) {
    const date = new Date(item.date)
    if (Number.isNaN(date.getTime())) continue
    days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  }
  return days.size
}
