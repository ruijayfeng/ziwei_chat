# Task 3 Report: Deterministic Home Date And Supported Composer Controls

## RED

- `npm run test -- tests/ui/current-calendar.test.ts` failed because `src/lib/ui/current-calendar.ts` did not exist.
- `npm run test -- tests/ui/redesigned-chat.test.ts` failed because the static date, background music control, and attachment control were still present.

## GREEN

- Added `currentCalendarDisplay(date)`, using `Intl.DateTimeFormat` with `Asia/Shanghai` and injected `Date` input.
- `HeroHeader` now renders the date only after a client mount update, with stable date-column width; sexagenary text and music control are removed while the inspector toggle remains.
- `ChatComposer` keeps the existing textarea/send surface and removes the unsupported attachment control.
- `npm run test -- tests/ui/current-calendar.test.ts tests/ui/redesigned-chat.test.ts`: 2 files, 8 tests passed.
- `npm run typecheck`: passed.
- `npm run lint -- --quiet`: passed.
- `git diff --check`: passed; Git only reported the repository's normal LF/CRLF conversion warnings.

## Review Fix RED

- The new rollover tests failed because `millisecondsUntilNextShanghaiDay` was not exported.
- The new source test failed because `HeroHeader` did not reference the rollover helper or day-boundary cleanup.

## Review Fix GREEN

- Added `millisecondsUntilNextShanghaiDay(date)` with deterministic UTC+08 day-boundary arithmetic; it returns `1000` at 23:59:59 Shanghai and `86400000` at Shanghai midnight.
- `HeroHeader` now refreshes after mount, schedules the next Shanghai midnight with a 50ms safety buffer, repeats daily, and clears the active timer on unmount.
- Replaced mojibake source assertions with `2025年05月14日`, `背景音乐`, and `添加附件`; added explicit `Music2`, `Paperclip`, rollover-helper, and `clearTimeout` assertions.
- `npm run test -- tests/ui/current-calendar.test.ts tests/ui/redesigned-chat.test.ts`: 11/11 passed under the default timezone.
- `$env:TZ='America/Los_Angeles'; npm run test -- tests/ui/current-calendar.test.ts tests/ui/redesigned-chat.test.ts`: 11/11 passed.
