# Ziwei Chat Final V1+ Release Design

## Decision

The final release target is a publishable open-source V1+ built on the accepted
`ziwei-chat-redesign` presentation and the existing anonymous Ziwei Agent
runtime.

The release is complete only when every visible product surface is backed by
real state or an explicit unavailable state, the five V1 topics and chart
explanation remain grounded and critic-checked, and the complete engineering
and browser acceptance gates pass.

This release does not expand into hosted SaaS. Accounts, authentication,
payment, subscriptions, quotas, attachments, background music, push
notifications, community features, multi-chart comparison, multi-school
switching, and advanced annual reports remain outside the release boundary.

## Alternatives Considered

### Publishable V1+ - selected

Complete every accepted route, add a sourced insights pipeline, strengthen the
six existing topic workflows, remove unsupported actions, and finish with a
full product acceptance pass.

This produces a coherent release without introducing account or monetization
infrastructure that the product constitution explicitly defers.

### Strict V1 stop line - rejected

Connect records, sidebar state, and date display while leaving insights as a
permanent empty state. This is technically releasable but leaves a first-class
route visibly incomplete and does not satisfy the requested final-version
closure.

### Full PRD end state - rejected

Add hosted accounts, administrative review, durable memory management,
subscriptions, advanced reports, and other operations-layer capabilities.
Those systems are independent products with materially larger privacy,
security, and operational requirements. They are not required to complete the
open-source-first release.

## Product Invariants

- The supplied redesign remains the visual source of truth.
- Backend state adapts through focused view-models; accepted page composition
  is not simplified to fit service contracts.
- The browser-scoped anonymous profile remains the only identity required.
- API keys stay in browser-local storage and request payloads. They are never
  persisted or logged.
- iztro remains the only source of deterministic chart calculation.
- The LLM never invents chart facts, calendar facts, conversation history, or
  insights.
- Every generated insight identifies its source conversations and time window.
- A failed or unavailable service produces an honest loading, empty, stale, or
  error state instead of static personalized content.
- Unsupported controls are removed from the release UI rather than shipped as
  inert promises.
- Existing anonymous-data deletion continues to clear server-owned and
  browser-owned data together.

## Release Architecture

The release keeps `WorkspaceProvider` as the browser state boundary and adds
small, pure adapters around the remaining data surfaces:

```text
anonymous profile
  -> chart restore/save -> chart display -> chart + sidebar view-models
  -> chat session -> current conversation fallback
  -> /api/conversations -> persisted records view-model
  -> conversation source bundle -> /api/insights
       -> deterministic aggregation
       -> optional provider generation
       -> insight critic
       -> sourced insight DTO
```

Adapters own parsing, normalization, source metadata, and display-safe
fallbacks. Presentation components receive already validated view-models and
do not fetch, infer, or fabricate domain state.

## Real Records

### Data source

The records route loads the profile-scoped list from `/api/conversations` and
loads messages for the selected conversation. When database persistence is
unavailable, the current browser chat session is exposed as the only record if
it contains visible messages.

### View-model

Each timeline entry contains:

- stable conversation id
- title derived from the persisted title or first user message
- last-message timestamp when available
- display date and time
- topic kind inferred only from the first user prompt through the existing
  intent vocabulary
- short preview from real visible message content
- full ordered user and assistant messages

Topic inference is presentation metadata only. It must not create a new
astrological conclusion.

### States

- loading: keep the timeline geometry stable and show a restrained loading row
- empty: explain that completed conversations will appear here
- persistence unavailable: show the current browser conversation and label it
  as local to this browser session
- recoverable error: retain any current-session fallback and expose retry
- selected conversation: load details lazily and prevent stale responses from
  replacing a newer selection

The static `RECORDS` and `MONTHLY_REFLECTION` data are removed. A monthly
reflection appears only when the insights pipeline has enough sourced data.

## Global Chart Summary

The desktop sidebar consumes `WorkspaceProvider.chartDisplay` through a pure
chart-summary adapter. The card shows only deterministic fields already
available in the sanitized chart DTO, such as chart display name and sourced
calendar labels.

When no chart exists, the same card becomes a create-chart entry. During chart
restore it displays a stable loading state. It never shows the fixed reference
birth pillars.

Mobile navigation retains the accepted route structure; chart identity does
not need a second mobile-only data contract.

## Deterministic Current Date

The home header receives a `CurrentCalendarDisplay` value from a pure calendar
adapter. Gregorian date and weekday come from an injected `Date`, formatted in
`Asia/Shanghai`. Sexagenary or lunar labels may be shown only when returned by
an existing deterministic iztro calendar API. If that API cannot provide a
field reliably, the field is omitted rather than calculated by custom rules.

Tests inject fixed dates and do not depend on the machine clock or timezone.

## Sourced Insights

### Source bundle

The browser assembles a bounded source bundle from persisted conversations and
the current session. Only user and assistant display text, conversation ids,
titles, and timestamps are included. Model settings are sent separately under
the existing browser-owned model-settings contract.

The initial release uses at most the latest 20 conversations, 200 visible
messages, and 60,000 characters after deterministic truncation. Tool payloads,
raw chart JSON, API keys, and hidden message metadata are excluded.

### Eligibility

Insights require at least two conversations, three user messages, and activity
across two distinct calendar days. When the threshold is not met, the route
shows an explicit insufficient-history state and links back to conversation.

### Aggregation

A deterministic aggregator produces:

- source window start and end
- conversation and user-message counts
- recurring topic counts using the existing intent vocabulary
- candidate excerpts with conversation id and message id provenance
- last generated time and a stable source fingerprint

The aggregator does not write interpretive prose.

### Generation

`POST /api/insights` accepts the source bundle and browser-owned model settings.
It requests a short weekly letter and up to three pattern observations. The
model must cite candidate source ids for every paragraph or pattern and must
use reflective, non-diagnostic language.

The response DTO contains:

```ts
type InsightReport = {
  sourceWindow: { from: string; to: string };
  generatedAt: string;
  sourceFingerprint: string;
  weeklyLetter: {
    greeting: string;
    paragraphs: Array<{ text: string; sourceIds: string[] }>;
    signoff: string;
  };
  patterns: Array<{
    id: string;
    title: string;
    detail: string;
    topic: string;
    sourceIds: string[];
  }>;
  critic: { passed: true; issues: [] };
};
```

Only critic-approved reports reach the presentation components. Reports are
cached in browser-local storage by anonymous profile and source fingerprint;
API keys and source message bodies are not cached with the report.

### Insight critic

The critic rejects a report when it:

- references an unknown source id
- contains a paragraph or pattern without provenance
- asserts medical, legal, investment, relationship-intent, or diagnostic facts
- presents Ziwei or behavioral interpretation as certainty
- claims a trend unsupported by at least two source excerpts
- exceeds the defined letter or pattern count

A failed provider call or rejected report produces a retryable error state.
Previously cached reports with a different fingerprint are marked stale and
are not presented as current.

## Anonymous Data Deletion

The default inspector action calls the same `deleteAnonymousData` operation as
the settings route and uses the same confirmation language. Successful
deletion clears chart, chat, evidence, conversation-derived report cache,
model settings, and profile id before issuing a fresh anonymous profile id.

Failure leaves local data intact and displays the existing deletion error. No
surface may claim deletion succeeded before the server request succeeds.

## Content Hardening

The active release topics remain:

- recent fortune
- career/work
- relationships
- wealth
- personality
- chart explanation

Each skill must define required deterministic facts, analysis order,
plain-language translation rules, safety boundaries, and exactly one useful
follow-up. Curated knowledge additions prioritize high-confidence
star-by-palace, four-transform-by-palace, and existing-tool-aligned pattern
material with strong `terms` metadata.

Advanced timing content is added only where `getLuckCycle` returns matching
deterministic facts. Health, family, children, home, and other unsupported
topic buttons are removed from active entry surfaces or mapped to a safe
general-chat explanation; they do not silently reuse a different skill.

Evaluation cases expand only where new curated material or insight behavior
creates a contract worth protecting.

## Unsupported Controls

The release does not ship inert attachment, background-music, or Pro actions.
Those controls are removed from active desktop and mobile surfaces while
preserving the accepted spacing and responsive hierarchy. No payment, upload,
or audio dependency is introduced.

## Migration Cleanup

After real routes use the final adapters:

- remove static personalized records and insight fixtures
- remove superseded approximate shell, chart, and records components that have
  no imports
- retain shared primitives and adapters still referenced by tests or routes
- update the nearest `AGENTS.md` member lists and affected development status
  documents
- keep the user-supplied `ziwei-chat-redesign/` reference repository untracked

Cleanup must not alter public API behavior or delete compatibility helpers that
remain in use.

## Error Handling

All browser fetches distinguish loading, unavailable persistence, retryable
network/provider failure, invalid response, and insufficient data. Abort stale
requests when route state or selection changes.

API errors use structured JSON with an error code and safe user-facing message.
No API response includes provider secrets, raw chart JSON, hidden message
metadata, or stack traces.

## Testing Strategy

### Unit and contract tests

- conversation-to-timeline transformation and current-session fallback
- stale selection protection and payload validation
- chart-summary states
- fixed-date calendar formatting and omitted unsupported fields
- insight source limits, eligibility, aggregation, fingerprint stability, and
  provenance validation
- insight critic rejection rules
- insight cache invalidation and anonymous-data deletion
- unsupported controls and static personalized fixtures absent from active UI

### Route tests

- `/api/conversations` ownership and sanitized payload behavior remain intact
- `/api/insights` rejects invalid, oversized, ineligible, unsourced, and
  critic-failing requests
- successful insight generation returns only the sanitized `InsightReport`
- `/api/chat` and `/api/chart` regression contracts remain unchanged

### Browser acceptance

At mobile and desktop widths, verify:

1. Create, restore, edit, and delete a primary chart.
2. Ask each of the five V1 topics and open evidence.
3. Reload and resume a persisted conversation when Postgres is configured.
4. Read the same current-session conversation when persistence is unavailable.
5. Generate insights from eligible real history and inspect source references.
6. See honest insufficient, provider-error, and stale-report states.
7. Delete anonymous data from settings and the default inspector.
8. Confirm no attachment, music, Pro, login, or payment dead action remains.
9. Confirm no text overlap or unusable control at 390px, 1024px, 1440px, and
   1536px.

### Release gates

The release requires all of the following:

- `npm run lint` with zero project-source errors
- `npm run typecheck`
- `npm run test`
- `npm run eval:agent`
- `npm run build`
- browser acceptance in deterministic/no-database mode
- browser acceptance with Postgres persistence
- one timed real-provider regression covering chat generation, final critic,
  insights generation, and recoverable provider failure
- Chinese copy and encoding review on every active route

## Completion Definition

Final V1+ is complete only when:

- all active routes render real data or explicit honest states
- no active route imports static personalized records or insights
- all visible controls have working behavior
- chart and calendar facts are deterministic
- chat and insights generated prose pass their respective critics
- conversation and insight provenance is inspectable
- anonymous deletion covers all release-owned data
- the six active skills and local knowledge retrieval satisfy their evaluations
- obsolete migration components are removed and documentation matches the
  resulting module map
- every automated and browser release gate has current passing evidence

