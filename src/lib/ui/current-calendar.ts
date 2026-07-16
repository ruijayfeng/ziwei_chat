export type CurrentCalendarDisplay = {
  dateLabel: string
}

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export function millisecondsUntilNextShanghaiDay(date: Date): number {
  const nextShanghaiMidnight =
    (Math.floor((date.getTime() + SHANGHAI_OFFSET_MS) / DAY_MS) + 1) * DAY_MS -
    SHANGHAI_OFFSET_MS

  return nextShanghaiMidnight - date.getTime()
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
