# Project Harness

This project reuses the control-plane pattern from **重生之我是门德斯**: repository
instructions, role ownership, task/review/result contracts, deterministic gate
profiles, validation scripts, and lessons/decision recording.

Mendes was chosen over the original Sales Funnel project because its Harness is
newer and materially more complete: it has `.agflow/`, machine-readable role and
gate policies, doctor/validation commands, templates, and explicit safety zones.
Only generic control-plane concepts were migrated. Football roles, simulation
rules, asset rules, and tests were not copied.

The clean reducer/state pattern in **销售漏斗 2** informed `app/trip-engine.ts`, but
its outbound-sales domain, automation runtime, and research actions remain outside
this Harness and project.

## Commands

```powershell
npm run harness:doctor
npm run harness:check
npm run typecheck
npm run harness:full
npm run dev
```

## Workflow

`task specification → plan → implementation → review → validation → decision/lesson`

The current task is a `heavy` Vertical Slice. Its formal local artifacts live in
the archived Sprint 3 task folder; the earlier Sprint baselines remain archived.

`harness:full` now includes strict TypeScript validation with incremental output
disabled, followed by ESLint and the production build. This gate is business-neutral;
Travorien signal, event, policy, and Trip behavior remains outside Harness Core.
