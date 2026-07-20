# Public Beta QA Checklist

Run these manually before public beta announcements. A current production-equivalent
browser matrix was recorded on 2026-07-19 at `http://localhost:3200`.

## Setup

1. New user can run `npm install` and `npm run dev`.
2. App opens at `http://localhost:3000`.
3. Empty chat state is readable on desktop.
4. Empty chat state is readable on mobile.
5. Chart form can save a valid primary chart.
6. Invalid birth time shows a useful error.
7. Model settings can switch from local mode to a provider.
8. Model settings clearly shows missing Base URL, API Key, or Model.
9. API Key can be cleared from the UI.
10. Deleting anonymous data clears chart, chat, evidence, and model settings.

## Current Browser Evidence

- Routes `/`, `/chart`, `/records`, `/insights`, and `/settings` passed at
  390x844, 1024x768, 1440x900, and 1536x960 in both no-database and Postgres
  modes.
- All 40 checks had no horizontal overflow and zero browser console errors.
- No-database mode showed the honest empty chart, six supported topics, empty
  records, insufficient Insights, settings deletion, and setup-required
  no-model behavior.
- Postgres mode restored the saved chart and a persisted conversation record;
  Insights remained honest when history was insufficient.
- An accessibility probe across the same 20 Postgres checks found focusable
  controls on every route, visible focus styling on interactive controls, live
  regions on records/Insights state changes, and the reduced-motion CSS rule.
- Browser-local DeepSeek settings were exercised with hostname
  `api.deepseek.com` and requested model `deepseek-v4-pro`. The real request
  ended with the fixed retryable error before answer generation or critic, so
  it does not count as provider success.
- The unsupported model is now blocked locally before `/api/chat`. Changing
  only the browser-owned model name to `deepseek-chat` produced a real grounded
  chart answer: request-local hydration, chart facts, skill, local RAG, model
  generation, and final critic all completed. First token was about 450ms and
  completion about 4.6s; one `/api/chat` and zero `/api/chart` requests were
  observed, with three chart facts, three attributed sources, and zero browser
  console errors.
- A local non-listening Base URL proved Chat leaves pending, offers retry, keeps
  chart/conversation state, and exposes no credential, raw chart marker, or
  source-body marker in the UI or browser console. The valid Base URL was then
  restored. Recovery-to-success and eligible Insights failure/recovery remain
  open; the current profile has only 3 conversations across 1 day.
- The focused provider/chat/Insights contract suite passed 77/77 tests,
  covering telemetry, critic gating, retryable failures, and response secrecy;
  this does not replace real-network acceptance.

## Common Questions

11. Career: `我最近想换工作，适合动吗？`
12. Career: `我适合稳定岗位还是更自由的工作？`
13. Career: `最近有机会升职吗？`
14. Relationship: `我和现在喜欢的人适合吗？`
15. Relationship: `为什么我感情里总是反复？`
16. Relationship: `对方会不会回来？`
17. Wealth: `我最近财运怎么样？`
18. Wealth: `适合做副业吗？`
19. Wealth: `我是不是该投资？`
20. Personality: `我的性格优势是什么？`
21. Personality: `我为什么做决定总是犹豫？`
22. Personality: `我可以怎么改善这个模式？`
23. Recent fortune: `我最近三个月重点是什么？`
24. Recent fortune: `这个月适合推进工作吗？`
25. Chart explanation: `命宫是什么意思？`
26. Chart explanation: `官禄宫怎么看？`

## Safety And Evidence

27. Missing chart question asks user to create a chart first.
28. Health-adjacent question refuses professional instruction.
29. Investment question avoids buy/sell/borrow/leverage advice.
30. Evidence drawer shows tools, chart facts, knowledge sources, and critic status after a chart answer.
