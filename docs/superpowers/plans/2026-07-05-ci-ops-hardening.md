# CI Ops Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add automated verification, basic API abuse protection, and deployment operations documentation for the Ziwei Chat MVP.

**Architecture:** GitHub Actions will run the same local verification commands already documented in `README.md`. Runtime hardening will add a small in-memory fixed-window limiter at the API route boundary so the MVP works without Redis or hosted infrastructure. Documentation will capture the operational knobs and smoke checks without making Neon rotation mandatory for this user.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, GitHub Actions, Vercel, optional Neon/Postgres.

## Global Constraints

- Do not rotate Neon credentials in this task; the user explicitly said Neon can be ignored for now.
- Keep open-source local fallback intact with `AI_PROVIDER=deterministic-local`.
- Do not add external services for rate limiting in the MVP hardening pass.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run eval:agent`, and `npm run build` before completion.

---

### Task 1: GitHub Actions Verification Workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing npm scripts in `package.json`.
- Produces: pull request and branch push verification for lint, typecheck, tests, evals, and build.

- [x] **Step 1: Create CI workflow**

Add a workflow that runs on `pull_request` and pushes to `master`, uses Node 20, installs via `npm ci`, and runs:

```bash
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

- [x] **Step 2: Document CI in README**

Add a short `Continuous Integration` section explaining that GitHub Actions mirrors local verification.

- [x] **Step 3: Verify workflow file syntax locally**

Run:

```bash
npm run lint
```

Expected: exit code 0.

### Task 2: API Rate Limiting

**Files:**
- Create: `src/lib/http/rate-limit.ts`
- Modify: `src/lib/AGENTS.md`
- Modify: `src/app/api/chat/route.ts`
- Test: `tests/app/chat-route.test.ts`

**Interfaces:**
- Produces: `checkRateLimit(input: RateLimitInput): RateLimitDecision`
- Produces: `resetRateLimitStore(): void`
- Consumes: `Request` headers at the `/api/chat` boundary.

- [x] **Step 1: Write failing route tests**

Add tests that set:

```ts
process.env.CHAT_RATE_LIMIT_MAX = "2";
process.env.CHAT_RATE_LIMIT_WINDOW_MS = "60000";
```

Then send three POST requests from the same IP and expect the third to return `429` with a `Retry-After` header. Add a second test confirming `DELETE /api/chat` is also limited.

- [x] **Step 2: Run tests to verify RED**

Run:

```bash
npm run test -- tests/app/chat-route.test.ts
```

Expected: the new tests fail because no limiter exists.

- [x] **Step 3: Implement limiter**

Create a small fixed-window limiter keyed by route, method, and best-effort client identifier. Defaults:

```text
CHAT_RATE_LIMIT_MAX=30
CHAT_RATE_LIMIT_WINDOW_MS=60000
```

The limiter must return a `429` response before parsing the body. Include `Retry-After` in seconds.

- [x] **Step 4: Run route tests to verify GREEN**

Run:

```bash
npm run test -- tests/app/chat-route.test.ts
```

Expected: route tests pass.

### Task 3: Operations Documentation

**Files:**
- Modify: `.env.example`
- Modify: `docs/development/deployment.md`
- Modify: `README.md`

**Interfaces:**
- Documents: `CHAT_RATE_LIMIT_MAX`
- Documents: `CHAT_RATE_LIMIT_WINDOW_MS`
- Documents: production smoke and review procedure.

- [x] **Step 1: Add env examples**

Add rate-limit variables to `.env.example` with safe MVP defaults.

- [x] **Step 2: Update deployment documentation**

Add sections for:

- CI gate expectations.
- Rate-limit environment variables.
- Production smoke checks after deployment.
- Monitoring note: Vercel logs are the MVP baseline; external error tracking is future work.

- [x] **Step 3: Verify docs remain consistent**

Run:

```bash
npm run lint
```

Expected: exit code 0.

### Task 4: Final Verification And Review

**Files:**
- Review all changed files.

**Interfaces:**
- Consumes: complete repository state.
- Produces: strict completion report with risks and commands run.

- [x] **Step 1: Run full verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

Expected: all commands exit 0.

- [x] **Step 2: Inspect git diff**

Run:

```bash
git diff --check
git diff --stat
git diff
```

Expected: no whitespace errors; changes are scoped to CI and ops hardening.

- [x] **Step 3: Perform adversarial review**

Review for:

- CI missing a required script.
- Rate limiter bypass or cross-test leakage.
- Broken anonymous local fallback.
- Undocumented environment variable.
- Overbuilt infrastructure.

- [x] **Step 4: Commit if verification passes**

Run:

```bash
git add .github/workflows/ci.yml .env.example README.md docs/development/deployment.md docs/superpowers/plans/2026-07-05-ci-ops-hardening.md src/app/api/chat/route.ts src/lib/AGENTS.md src/lib/http/rate-limit.ts tests/app/chat-route.test.ts
git commit -m "chore: add ci and ops hardening"
```
