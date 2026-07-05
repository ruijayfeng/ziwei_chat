# Ziwei Chat Product Experience UI Design Spec

> Version: 2026-07-05
> Status: Ready for user review before implementation planning

## Goal

Upgrade the current MVP UI into a high-trust product surface: a precise Ziwei
analysis workspace with a warm companion chat at the center.

The interface should make three ideas obvious on first view:

1. The user can chat naturally.
2. Serious answers are grounded in chart facts, tools, knowledge, and critic
   checks.
3. The product is calm and helpful, not mystical, fear-based, or decorative.

## Design Direction

Primary direction: **Evidence Companion**.

This is a product UI, not a landing page. The first screen should be the usable
application:

- Left: current chart and profile controls.
- Center: chat as the primary work surface.
- Right: evidence drawer for tools, chart facts, knowledge sources, and critic
  status.

The visual language should feel calm, precise, companion-like,
evidence-backed, and contemporary Chinese.

Avoid:

- red/gold fortune-telling palettes
- parchment, temple, oracle, or antique decoration
- generic purple AI gradients
- game-like dark celestial dashboards
- purely marketing-style hero sections

## Visual System

### Color

Use a restrained light product palette:

- App background: `#F7F7F4`
- Primary ink: `#181816`
- Muted ink: `#5F5F58`
- Hairline/border: `#D8D8D0`
- Surface: `#FFFFFF`
- Primary accent: `#0F766E`
- Emphasis/warning accent: `#A33A2B`

Low-saturation chart and evidence colors:

- Palace/chart teal
- Muted indigo
- Amber
- Gray violet
- Neutral gray

Accent colors must carry semantic meaning. Do not use color as decoration.

### Type

Use `next/font` for production loading.

- Main Chinese UI: `Noto Sans SC` if added successfully, otherwise retain Geist
  for Latin and use the system Chinese sans fallback.
- Latin and numbers: existing `Geist`.
- Monospace/data labels: existing `Geist Mono`.
- Optional limited display serif: `Noto Serif SC` only for chart/profile title
  accents, never as the dominant UI font.

Typography should be compact and readable. Chat and form body text should remain
plain, with no ornamental line-height or oversized display treatment inside
tool surfaces.

### Shape And Material

- Cards and panels use `8px` radius by default.
- Buttons and inputs use `8px` radius.
- Badges may use pill radius when they represent status.
- Avoid nested cards.
- Prefer hairline borders, section dividers, and stable spacing over large
  decorative shadows.

## Component Reuse Strategy

Do not hand-build generic UI primitives when mature open-source components can
save time and improve accessibility.

Recommended reuse candidates, to verify during planning/implementation:

- `lucide-react` for icons, using one icon family consistently.
- Radix primitives for accessible overlays and keyboard behavior:
  - `@radix-ui/react-dialog` for clear-data confirmation and mobile evidence
    drawer.
  - `@radix-ui/react-tabs` if the mobile profile/evidence surface needs tabs.
  - `@radix-ui/react-tooltip` for icon-only controls.
- shadcn/ui as a source of component patterns, not as a default visual style.
  If used, import only specific primitives such as button, dialog, sheet, badge,
  separator, and textarea, then restyle them to Ziwei Chat's system.
- `motion` can be considered for purposeful state transitions, but MVP should
  prefer native CSS transitions unless motion materially improves clarity.
- `gsap` can be considered for information-dense animation that needs a real
  timeline, especially future luck-cycle timelines, annual report pages,
  evidence-chain reveals, or scroll-linked explanatory graphics. Do not use
  GSAP for ordinary button hovers, panel fades, or decoration in the MVP shell.

No large design system should be installed for this slice. The app is too small
for Carbon, Fluent, Material, or Atlassian-style dependencies.

## Information Architecture

### Desktop Layout

Keep the three-column structure, but make the hierarchy more intentional:

```text
+----------------------+-----------------------------+----------------------+
| Current Chart         | Chat                        | Evidence             |
| Profile controls      | Natural questions           | Tool calls           |
| Topic shortcuts       | Streaming answer            | Chart facts          |
| Data deletion         | Error/retry states          | Knowledge + critic   |
+----------------------+-----------------------------+----------------------+
```

Column behavior:

- Left column: fixed-width management rail, not a marketing sidebar.
- Center column: widest and visually dominant.
- Right column: evidence rail, dense but calm.

The user should not need to understand Ziwei terminology before sending the
first question.

### Mobile Layout

Mobile is chat-first:

- Chat appears first.
- Current chart summary is available above or inside a compact collapsible
  area.
- Evidence opens as a drawer/sheet.
- Topic shortcuts remain reachable without pushing the chat too far down.

No horizontal scrolling, hidden essential controls, or desktop-only evidence
behavior.

## Feature Scope For This UI Slice

### 1. Fix Current Product Copy

Repair the corrupted Chinese text across visible UI components.

Use plain product copy:

- "当前命盘"
- "保存命盘"
- "正在分析"
- "重新生成"
- "依据"
- "工具调用"
- "命盘事实"
- "知识来源"
- "已通过检查"

Avoid expert-only terms unless paired with plain explanation.

### 2. Chart/Profile Management Area

Replace the current one-line chart status with a real management section.

Show:

- chart name
- birth date
- birth time
- gender
- calendar type
- optional birthplace
- whether the chart has been synced into the current conversation

Actions:

- edit chart
- save chart
- reset chart draft
- clear anonymous profile data

The clear-data action must use a confirmation dialog. The dialog must state
that it deletes local anonymous profile state for this browser, current chart
state, conversation messages, and displayed evidence. It must not imply account
deletion because MVP has no product account.

### 3. Chat Surface

The chat panel should be the emotional center of the app.

Required states:

- empty state with one clear invitation to ask a question
- sending/streaming state with "正在分析"
- disabled submit state for empty input
- network error state with retry guidance
- 429/rate-limit state with calm retry copy
- empty response state if the API returns no readable content

Message styling:

- User messages are compact and aligned right.
- Assistant messages are readable, slightly wider, and preserve line breaks.
- Do not over-style assistant responses; trust comes from clarity and evidence.

### 4. Evidence Drawer

Make evidence feel like product trust, not developer debug output.

Sections:

- Tool calls
- Chart facts
- Knowledge sources
- Critic result

Empty state:

- "发送一次命盘相关问题后，这里会显示依据。"

Critic statuses:

- Not run: neutral
- Passed: teal success
- Needs review: vermilion warning

Evidence list items should be scannable and dense. Avoid large decorative cards.

### 5. Topic Entry

Keep five MVP topics:

- 近期运势
- 事业工作
- 感情关系
- 财富节奏
- 性格分析

Topic controls should feel like quick actions, not marketing chips. Use icons if
they improve scanning.

## Data And State Behavior

This UI slice should stay compatible with the current anonymous-profile model.

Local browser profile data:

- profile id in `localStorage`
- current in-memory chart draft
- current in-memory messages
- current in-memory evidence

No product login, account settings, payments, cross-device sync, or Neon work is
part of this UI slice.

When a chart is edited after a conversation has already synced chart data, mark
the chart as unsynced until the next successful chat request.

## Error Handling

`POST /api/chat` failures must produce useful UI states:

- Network failure: "网络连接失败，请稍后重试。"
- Rate limited: "请求太频繁了，请稍等一下再继续。"
- Server failure: "分析没有完成，请重试。"
- Empty response: "这次没有生成可读回复，请重新发送。"

The UI should leave the user's draft or sent message recoverable when possible.

## Implementation Boundaries

In scope:

- design tokens in global CSS
- font loading updates
- component styling and layout
- accessible confirmation dialog
- chat error/loading states
- responsive desktop/mobile behavior
- targeted tests for new behavior

Out of scope:

- authentication
- multiple charts
- persistent conversation browser
- report pages
- full animated star chart
- timeline-heavy luck-cycle or annual-report animation
- large third-party design systems
- database/Neon changes

## Reference Research Plan

Use references as design input, not cloning targets:

- Linear: density, restraint, status hierarchy.
- Raycast: compact command-like interactions and keyboard-friendly surfaces.
- Figma: complex tool UI clarity and panel organization.
- Notion: ordinary-user knowledge organization.
- Stripe: trust, hierarchy, and quiet confidence.
- Co-Star and The Pattern: only to understand modernized mystical product tone;
  Ziwei Chat should remain more evidence-oriented.
- GSAP official resources: study timeline, ScrollTrigger, React cleanup, and
  performance patterns only if an implementation slice genuinely needs
  timeline-based information graphics or scroll-linked explanatory motion.

The `clone-website` tool may be used for targeted extraction from reference
pages when a specific layout or interaction needs study. Do not clone entire
sites into this product.

## Testing And Verification

Required verification after implementation:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run eval:agent`
- `npm run build`

UI verification:

- Desktop screenshot around `1440px`.
- Mobile screenshot around `390px`.
- Confirm no obvious text overflow.
- Confirm clear-data dialog works by keyboard and pointer.
- Confirm chat empty, loading, error, and success states are visible.
- Confirm evidence panel is usable on desktop and mobile.

## Acceptance Criteria

The UI slice is accepted when:

- The app opens directly into the product, not a landing page.
- Chinese UI copy is readable and no visible mojibake remains in primary
  surfaces.
- The center chat surface is the dominant first impression.
- The chart/profile area clearly shows what data the app is using.
- The evidence area makes grounded analysis visible without overwhelming the
  user.
- Clearing anonymous profile data requires explicit confirmation.
- Network, server, rate-limit, loading, empty, and success states are handled.
- Mobile users can chat first and still reach chart and evidence controls.
- The visual system matches Evidence Companion: calm, precise, contemporary,
  evidence-backed.

## Risks

- Over-polishing the frame while leaving broken states unfixed would make the
  product feel fake.
- Making the interface too mystical would weaken trust.
- Making the interface too dense would scare ordinary users before first chat.
- Installing a large design system would add complexity without improving this
  MVP.
- Copying reference sites too closely would erase Ziwei Chat's own product
  identity.
