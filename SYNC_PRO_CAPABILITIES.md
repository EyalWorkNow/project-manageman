# SyncPro Capabilities Guide

This document explains what the current MVP can do, what it cannot do yet, and how to use it.

## What You Can Do Now

- View a portfolio dashboard with active projects, pending tasks, blocked paths, critical work, and completion reliability.
- Search projects by project name, client name, or project manager.
- Create a new project with client, owner, status, description, and deadline.
- Edit an existing project without creating a duplicate.
- Create or edit tasks under a project.
- Assign task owner, due date, priority, and canonical status values.
- Mark a task as blocked and require a blocker explanation.
- Store internal notes for the PM/team workspace.
- Open a project detail page and see progress, PM next action, blockers, tasks, and AI actions.
- Generate an internal AI project summary.
- Generate a customer-safe status update.
- Open a stakeholder/customer view that hides internal notes and raw technical blocker details.
- Switch the interface between English and Hebrew.
- Generate AI output in the selected language.
- Persist demo data locally in `.data/syncpro-db.json`.
- Run with Gemini when `GEMINI_API_KEY` is configured.
- Fall back to deterministic local summaries if Gemini fails, so the demo remains usable.
- Review the `/submission` page for the product brief, MVP scope, workflow, UX trade-offs, and prompt log.

## What You Cannot Do Yet

- There is no user authentication or role-based permission model.
- There is no production database.
- There are no real notifications, email sending, Slack updates, or calendar integrations.
- There are no file uploads or document attachments.
- There is no audit log per user.
- There is no multi-tenant security boundary.
- There is no drag-and-drop task board.
- There is no advanced capacity planning, time tracking, or resource forecasting.
- There is no deployment automation included in this repository.

## How To Run

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is busy:

```bash
PORT=3100 npm run dev
```

## Gemini Setup

Create `.env`:

```bash
GEMINI_API_KEY="your-key"
GEMINI_MODEL="gemini-2.5-flash"
```

The current local workspace already has `.env` configured. The file is ignored by git.

## Recommended Demo Flow

1. Open the dashboard.
2. Review the workflow guide and system readiness panel.
3. Search for a project or open an at-risk project.
4. Review the PM next action and blocker panel.
5. Create or edit a blocked task.
6. Switch language between English and Hebrew.
7. Generate an internal AI summary.
8. Generate a customer-safe update.
9. Open the customer view and confirm internal notes are not shown.
10. Open `/submission` and review the product brief.

## Validation Commands

```bash
npm run lint
npm run build
NODE_ENV=production npm start
```

## Data Reset

To reset demo data:

```bash
rm -rf .data
npm run dev
```

The server will recreate seeded demo projects and tasks.
