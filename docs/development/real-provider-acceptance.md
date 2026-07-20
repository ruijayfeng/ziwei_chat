# Real Provider Acceptance Runbook

> Scope: Final V1+ Task 12 real-network evidence only.
> This runbook does not accept deterministic-local output or mocked fetches as
> real-provider evidence.

## Preconditions

Use a disposable browser profile or clear the existing anonymous data before
starting. Keep the provider key out of shell history, screenshots, browser
logs, test output, and committed files.

Configure a reachable OpenAI-compatible chat service through the Settings page:

- Provider: the matching provider option, or `自定义兼容`
- Base URL: the provider's `/v1`-compatible base URL
- API Key: supplied only in the browser form
- Model: a chat-capable model id

The shell environment is not a substitute for browser-owned settings. If a
temporary diagnostic shell is used, pass values through an unlogged secret
store and never print the key.

## Chat Success

1. Start the production-equivalent build and open `/`.
2. Create or restore a real chart.
3. Configure the provider in `/settings`, then return to `/`.
4. Use the `事业` entry or ask `我目前的事业方向，适合关注什么？`.
5. Confirm the UI receives token events, reaches a completed assistant answer,
   and shows the evidence inspector.
6. Record only these fields: date, base URL hostname, model id, first-token
   milliseconds, completion milliseconds, final critic status, and response
   status. Do not record the key, raw chart JSON, or source bodies.

Expected evidence: `generation.mode=model`, non-null first-token timing,
completion timing greater than or equal to first-token timing, and a passed
final critic before the answer is displayed.

Before recording success, inspect the completed response UI, evidence panel,
browser console, and production server output. Confirm none contains the API
key, raw chart JSON, or an Insights source body. Inspect network response data
only through a bounded secrecy check; do not save or print the response body.

## Insights Success

Use a profile with enough persisted eligible conversations. Open `/insights`,
wait for the report, and verify the weekly letter and every pattern expose a
source disclosure. Record status, completion duration, source-window metadata,
critic status, and report fingerprint only. Never save the source bundle or
provider response body in the evidence file. Repeat the same bounded success-
path secrecy inspection for the Insights response, UI disclosures, browser
console, and production server output before recording success.

## Recoverable Failure

After a successful run, change only the browser model Base URL to a guaranteed
non-listening local reserved address such as `http://127.0.0.1:9/v1`. This keeps
the real key on the local machine and guarantees that no third party can receive
the failure-injection request. Do not use a remote 5xx endpoint with the real
key. A remote failure endpoint is acceptable only with a disposable test key
and explicit confirmation that it does not log Authorization headers. Submit
one chat request and one eligible Insights request. Verify:

- the UI leaves no indefinite pending state;
- the error is marked retryable;
- no credential, raw chart JSON, or source body appears in the response,
  evidence panel, browser console, or server output;
- restoring the valid Base URL and retrying succeeds without clearing the
  chart or conversation unnecessarily.

## Evidence Record

Store the result in `docs/development/project-status.md` using this shape:

```text
Real provider: <date>; provider hostname: <host>; model: <id>
Chat: success; first token: <ms>; completion: <ms>; final critic: passed
Insights: success; completion: <ms>; critic: passed; sources disclosed: yes
Failure: controlled provider error; retryable: yes; recovery: success
Secrecy: key leaked: no; raw chart JSON leaked: no; source body leaked: no
```

Do not mark G10 or Task 13 closed until the record is backed by the live
browser/network run and an independent review.

## Teardown

After recording the bounded evidence, use the Settings UI to clear the answer
API key, or complete anonymous-data deletion when the disposable profile is no
longer needed. Verify through the UI that the browser-owned model settings no
longer contain an API key. Do not inspect localStorage directly and do not print
or save the previous key while verifying cleanup.
