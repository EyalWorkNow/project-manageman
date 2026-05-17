# LinnoProjact PM Command Dashboard

LinnoProjact is a high-end, premium project management command center and Kanban workspace. It is designed to empower project managers to track delivery cadences, visualize task lifecycles, safely highlight blockers, and generate instant internal or customer-facing status updates with Gemini AI integrations.

## Key Accomplishments & Features

- **Premium Responsive Sidebar:** Completely branded with `LinnoProjact LOGO.svg` and customized styled topbar for desktop and mobile viewports.
- **Advanced Kanban Board:** Real-time physical drag-and-drop task lifecycles utilizing `dnd-kit`, communicating dynamically with PostgreSQL database states.
- **Sleek Task Creation Workspace:** Option to mock audio recordings, attach images, and seamlessly search/assign project team members.
- **Modernized Team Members Panel:** Responsive grid of modern glassmorphic card elements featuring unique random colorful gradient avatars, edit/delete options inside a custom 3-dots menu, a typed-confirmation modal for safe deletion, and an animated Direct Messaging portal.
- **Smart Real-time Search & Filters:** Instant name/email search bar and dynamic role filtering in the Project Members panel.
- **Dual-Pane AI Assistant:** Full-featured conversational project assistant providing internal summaries and safe status updates in Hebrew and English.

## Run Locally

Prerequisites: Node.js 20+.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Configuration & Databases

The project is powered by a PostgreSQL 14+ database and an Express backend (`server.ts`).

### Environment Variables (.env)

```bash
GEMINI_API_KEY="your-key"
GEMINI_MODEL="gemini-1.5-flash"
PORT=3000
```

If the Gemini API key is missing or calls fail, LinnoProjact returns robust deterministic local fallbacks so the application remains fully functional end-to-end.

## Demo Sequence

1. **Dashboard & Portfolio:** View active projects, overall completion progress, and blocker logs.
2. **Project Detail Space:** Check team progress, next actions, and the Kanban board.
3. **Task Manipulation:** Drag and drop tasks across columns in real-time or add a task with image/voice attachments.
4. **Smart Assistant:** Fire quick prompts or custom chat messages to get detailed breakdowns of bottlenecks.
5. **Team Management:** Search, filter, or manage participants in the redesigned grid cards. Check the safe delete verification popup!
6. **Customer Portal:** Verify that the customer view cleanly filters out internal details.

---

For technical specifications and constraints, please review [LINNO_PROJACT_CAPABILITIES.md](LINNO_PROJACT_CAPABILITIES.md).
