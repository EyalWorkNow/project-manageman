# SyncPro PM Task MVP

SyncPro is a working MVP for the Technological PM assignment. It helps project managers track tasks across multiple enterprise client projects, identify blockers, and generate customer-safe status updates.

## What Is Included

- Portfolio dashboard with active projects, open tasks, blockers, and completion reliability.
- Project detail workspace with progress, owner, deadline, task table, blocker ledger, and PM next action.
- Project and task create/edit flows with canonical status and priority values.
- Customer/stakeholder view that hides internal notes and raw technical blocker details.
- AI-assisted internal summaries and customer updates.
- Submission page with product brief, workflow, UX trade-offs, and prompt log.
- Local JSON persistence in `.data/syncpro-db.json`.
- UX guidance panels and English/Hebrew language switching across the main product flow.

For a full list of current capabilities and limits, see [SYNC_PRO_CAPABILITIES.md](SYNC_PRO_CAPABILITIES.md).

## What Is Intentionally Excluded

- Authentication, permissions, billing, notifications, integrations, and production database setup.
- Complex resource planning or individual productivity tracking.
- Deployment automation.

## Run Locally

Prerequisites: Node.js 20+.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Optional Gemini Setup

The app works without an API key. If `GEMINI_API_KEY` is set, the backend will call Gemini for the AI summary routes. If the key is missing or Gemini fails, SyncPro returns deterministic local fallback summaries so the demo remains usable end-to-end.

```bash
cp .env.example .env
# edit .env and set GEMINI_API_KEY if you want external AI generation
npm run dev
```

## Demo Path

1. Open the dashboard and review portfolio health.
2. Open a project and inspect progress, blockers, and PM next action.
3. Create or edit a task, including a blocked task with a blocker reason.
4. Generate an internal AI summary and customer update from the project detail page.
5. Open the customer view and confirm it shows safe stakeholder-facing information only.
6. Open `/submission` to review the assignment brief and prompt log.

## Verification Commands

```bash
npm run lint
npm run build
```
