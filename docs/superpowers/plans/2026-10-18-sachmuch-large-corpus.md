# Sachmuch 100,000+ fact corpus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reach at least 100,000 distinct, sourced, interesting facts in either English or Hindi, accessible in the app.

**Architecture:** Execute three linked, separately testable plans in dependency order. Keep the current curated app operating throughout compatibility work, source pilots and staged rollout.

**Tech Stack:** TypeScript, Expo/React Native, Next.js, Postgres/Drizzle, GitHub Actions, Jest and Vitest. Retain installed dependency versions unless a demonstrated compatibility fix requires a change.

**Spec:** [../specs/2026-10-18-sachmuch-large-corpus-design.md](../specs/2026-10-18-sachmuch-large-corpus-design.md)

## Global Constraints

- English OR Hindi is sufficient. A translation is optional and must not delay publication.
- Success means 100,000 or more distinct eligible, published claims actually reachable through the production feed—not raw source rows, draft candidates, translations, rewritten sentences or an inflated UI counter.
- Preserve the approved smooth vertical swipe, complete short cards, personal filled-heart/sprinkle interaction, quiet music and downloaded reading. Movie/Bollywood facts remain excluded.
- No new paid service, paid model or subscription is part of this design.
- Hook target 4–12 words; body target 15–40 words, normally no more than 220 characters per language. Never truncate a caveat or manufacture filler to meet a minimum.
- Sources named in the design are candidates, not assumed implementations. Verify endpoint, terms, reuse, coverage and throttling before onboarding.
- No fixed ETA until the pilot measures accepted throughput. The target remains 100,000+ even if an early batch is smaller.
- Read the approved spec and applicable repository instructions before execution; use an isolated worktree at execution time. Never print credentials.

## Review Focus

The owning plans specify tests for language loss, duplicate claims, partial imports, unstable cursors and incorrect published counts. These are release gates, not optional follow-up work.

## Execution order

1. [A — language and data foundation](2026-10-18-corpus-a-foundation.md): v2 contract, additive migrations, legacy compatibility and mobile fallback.
2. [B — acquisition and quality](2026-10-18-corpus-b-acquisition.md): evidence, canonical dedupe, resumable imports, source pilots and measured growth.
3. [C — large feed and rollout](2026-10-18-corpus-c-feed-rollout.md): balanced snapshots, 50-item cursor pages, bounded mobile sessions and verified production rollout.

A1–A3 precede B persistence. C1–C2 can be exercised with clearly marked isolated synthetic fixtures while real content grows, but production switch waits for accepted coverage. C3 depends on A4/C2. B imports continue through C4 until the target is actually met.

## Practical execution recommendation

Use native execution in this chat with one independent final code review, plus migration/pilot release checks. These tasks share contracts and operational state, so one implementer reduces handoff errors. Subagent-driven execution is available if the user prefers an independent review after every task; it carries more context/review overhead. No subagents are needed merely to read this plan.

## Initial operational checkpoints

- [ ] Inspect current GitHub Actions DATABASE_URL metadata and run a credential-redacted connectivity probe. Never copy a write-only secret from Vercel or ask for a password in chat.
- [ ] Inspect existing storage/capacity and obtain a backup before database changes; do not assume a free plan accommodates the target.
- [ ] Use existing public/curated endpoint as the known-good rollback while implementing.
- [ ] Keep tasks and achieved corpus counts in docs/corpus-rollout-report.md. All implementation checkboxes begin unchecked because this document is a plan, not delivered software.

## Plan self-review

Spec coverage is mapped as follows: topics/sources -> B4/B5; language/migration -> A1–A4; identity/quality -> B1/B3; imports/operations -> B2/B5; scale/feed -> C1–C3; verified growth/rollback -> A exit gate/C4. The interface names above are shared across tasks. No projected source yield, price or completion date is asserted. The 100,000+ target is retained through the final rollout gate.

## Approval and execution handoff

Review this index and the three linked plans. Choose **Native** (recommended: implement here, independent final review) or **Subagent-driven** (separate implementer/reviewer for each task). Implementation starts after review and execution-method selection, following the requested Superpowers workflow.
