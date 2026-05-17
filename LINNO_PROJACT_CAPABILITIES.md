# LinnoProjact Capabilities Guide

This document explains what the current MVP of **LinnoProjact** can do, its limits, and how to verify it.

## Key Capabilities

- **Command Center Dashboard:** View active projects, open tasks, blocked actions, and completion reliability statistics at a glance.
- **Dynamic Search:** Instantly search through projects by project name, client name, or project manager.
- **Project Life-cycle Workspace:** Create and update projects, deadlines, statuses, and managers.
- **PostgreSQL-backed Kanban Board:** Drag and drop tasks across "To Do", "In Progress", "Waiting for Client", "Blocked", and "Done" statuses with instantaneous DB synchronizations.
- **Dynamic Project Members Portal:**
  - Responsive modern card grid.
  - Custom 3-dots dropdown menu.
  - Inline role/title quick editor.
  - Real-time search by name/email.
  - Dynamic filtering by existing roles.
  - Interactive Direct Messaging popups.
  - Secure removal modal requiring typed confirmation ("הסר" or "REMOVE").
- **Task Form Attachments:** Add images and voice recordings to tasks which seamlessly serialize into task descriptions for demo purposes.
- **Double-Pane AI Smart Assistant:** Full-featured conversational project assistant providing internal summaries and safe status updates in Hebrew and English.
- **Gemini API Integration:** Built with direct hooks to `google-genai` (Gemini 1.5 Flash).
- **Graceful Fallbacks:** Deterministic local AI summaries trigger automatically if Gemini keys are missing or requests fail, ensuring zero downtime.
- **RTL & Hebrew Language Support:** Full application flow translates perfectly between English and Hebrew.

## Project Out-of-Scope (MVP Exclusions)

- Full email/Slack delivery systems (actions are mocked beautifully in the UI).
- Real binary hosting servers for audio/image uploads (encoded seamlessly inside text bodies).
- User auth / custom RBAC permission models.

## How To Run

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:3000
```

## Validation Commands

```bash
npm run lint
npm run build
```
