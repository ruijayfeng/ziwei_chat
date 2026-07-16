export type CurrentCalendarDisplay = {
  dateLabel: string
}

export function currentCalendarDisplay(date: Date): CurrentCalendarDisplay {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

  return {
    dateLabel: `${values.year}\u5e74${values.month}\u6708${values.day}\u65e5 \u00b7 ${values.weekday}`,
  }
}
