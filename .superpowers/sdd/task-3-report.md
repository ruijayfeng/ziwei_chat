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
