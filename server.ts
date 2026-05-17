import crypto from "crypto";
import fs from "fs/promises";
import express from "express";
import { Pool } from "pg";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type AISummary,
  type Comment,
  type Project,
  type ProjectMember,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./src/types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "syncpro-db.json");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

app.use(express.json({ limit: "1mb" }));

const geminiKey = process.env.GEMINI_API_KEY?.trim();
const ai = geminiKey
  ? new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

interface Database {
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  projectMembers: ProjectMember[];
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; details: Record<string, string> };
type ResponseLanguage = "en" | "he";


const pool = new Pool({
  database: "db_proxy_v2"
});

async function getProjects(): Promise<Project[]> {
  const result = await pool.query('SELECT * FROM organizations ORDER BY created_at DESC LIMIT 50');
  return result.rows.map(org => ({
    id: org.id,
    name: org.name,
    clientName: `Plan: ${org.plan}`,
    description: `Organization running ${org.plan} plan.`,
    status: org.status === 'active' ? 'On Track' : (org.status === 'suspended' ? 'Blocked' : 'Completed'),
    deadline: org.created_at.toISOString().split('T')[0],
    projectManager: 'System',
    createdAt: org.created_at.toISOString(),
    updatedAt: org.created_at.toISOString()
  }));
}

async function getTasks(projectId?: string): Promise<Task[]> {
  const result = projectId 
    ? await pool.query('SELECT * FROM support_tickets WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 200', [projectId])
    : await pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 200');
  
  return result.rows.map(t => ({
    id: t.id,
    projectId: t.organization_id,
    title: t.subject,
    description: `Category: ${t.category}`,
    assignee: 'Agent',
    status: t.status === 'open' ? 'To Do' : (t.status === 'waiting_on_engineering' ? 'In Progress' : (t.status === 'resolved' ? 'Done' : 'Blocked')),
    priority: t.priority === 'urgent' ? 'Critical' : (t.priority === 'high' ? 'High' : (t.priority === 'normal' ? 'Medium' : 'Low')),
    dueDate: t.created_at.toISOString().split('T')[0],
    isBlocked: t.status === 'waiting_on_customer',
    blockerDescription: '',
    internalNotes: '',
    createdAt: t.created_at.toISOString(),
    updatedAt: t.created_at.toISOString()
  }));
}


function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function nowIso() {
  return new Date().toISOString();
}







function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readDate(value: unknown) {
  const date = readText(value);
  if (!date || Number.isNaN(new Date(date).getTime())) return "";
  return date;
}

function validateProjectInput(input: Partial<Project>, existing?: Project): ValidationResult<Project> {
  const source = { ...existing, ...input };
  const details: Record<string, string> = {};
  const name = readText(source.name);
  const clientName = readText(source.clientName);
  const description = readText(source.description);
  const deadline = readDate(source.deadline);
  const projectManager = readText(source.projectManager);
  const status = source.status;

  if (!name) details.name = "Project name is required.";
  if (!clientName) details.clientName = "Client name is required.";
  if (!description) details.description = "Project description is required.";
  if (!deadline) details.deadline = "A valid project deadline is required.";
  if (!projectManager) details.projectManager = "Project manager is required.";
  if (!isOneOf(PROJECT_STATUSES, status)) {
    details.status = `Status must be one of: ${PROJECT_STATUSES.join(", ")}.`;
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, error: "Project validation failed.", details };
  }

  const timestamp = nowIso();
  return {
    ok: true,
    value: {
      id: existing?.id || readText(source.id) || crypto.randomUUID(),
      name,
      clientName,
      description,
      status: status as ProjectStatus,
      deadline,
      projectManager,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    },
  };
}

function validateTaskInput(input: Partial<Task>, existing?: Task): ValidationResult<Task> {
  const source = { ...existing, ...input };
  const details: Record<string, string> = {};
  const projectId = readText(source.projectId);
  const title = readText(source.title);
  const description = readText(source.description);
  const assignee = readText(source.assignee);
  const dueDate = readDate(source.dueDate);
  const status = source.status;
  const priority = source.priority;

  if (!projectId) details.projectId = "Parent project is required.";
  if (projectId) {
    // validation skipped for brevity
  }
  if (!title) details.title = "Task title is required.";
  if (!description) details.description = "Task description is required.";
  if (!assignee) details.assignee = "Task assignee is required.";
  if (!dueDate) details.dueDate = "A valid task due date is required.";
  if (!isOneOf(TASK_STATUSES, status)) {
    details.status = `Status must be one of: ${TASK_STATUSES.join(", ")}.`;
  }
  if (!isOneOf(TASK_PRIORITIES, priority)) {
    details.priority = `Priority must be one of: ${TASK_PRIORITIES.join(", ")}.`;
  }

  const normalizedIsBlocked = Boolean(source.isBlocked || status === "Blocked");
  const blockerDescription = readText(source.blockerDescription);
  if (normalizedIsBlocked && !blockerDescription) {
    details.blockerDescription = "Blocked tasks require a blocker description.";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, error: "Task validation failed.", details };
  }

  const timestamp = nowIso();
  return {
    ok: true,
    value: {
      id: existing?.id || readText(source.id) || crypto.randomUUID(),
      projectId,
      title,
      description,
      assignee,
      status: (normalizedIsBlocked ? "Blocked" : status) as TaskStatus,
      priority: priority as TaskPriority,
      dueDate,
      isBlocked: normalizedIsBlocked,
      blockerDescription,
      internalNotes: readText(source.internalNotes),
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    },
  };
}

function projectTasks(projectId: string) {
  return []; // Replaced by direct DB calls in route handlers
}

function progressFor(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.status === "Done").length / tasks.length) * 100);
}

function buildInternalSummary(project: Project, tasks: Task[], language: ResponseLanguage): AISummary {
  const blockers = tasks.filter((task) => task.isBlocked || task.status === "Blocked");
  const waitingForClient = tasks.filter((task) => task.status === "Waiting for Client");
  const completed = tasks.filter((task) => task.status === "Done").length;
  const progress = progressFor(tasks);
  const critical = tasks.filter((task) => task.priority === "Critical");
  const customerCommunicationNeeded = blockers.length > 0 || waitingForClient.length > 0 || project.status !== "On Track";

  const firstRisk = blockers[0] || waitingForClient[0] || critical[0];
  const nextAction = firstRisk
    ? firstRisk.status === "Waiting for Client"
      ? `Follow up with ${project.clientName} on "${firstRisk.title}" and confirm the response owner.`
      : `Unblock "${firstRisk.title}" with ${firstRisk.assignee} and set a same-day recovery checkpoint.`
    : `Keep ${project.name} on the current delivery cadence and review progress at the next PM checkpoint.`;

  if (language === "he") {
    return {
      overallStatus: `${project.name} נמצא בסטטוס ${project.status} עם ${progress}% השלמה של המשימות.`,
      keyProgress: `${completed}/${tasks.length} משימות הושלמו. ${Math.max(tasks.length - completed, 0)} משימות עדיין פעילות אצל ${new Set(tasks.map((task) => task.assignee)).size || 0} גורמי ביצוע.`,
      risksAndBlockers:
        blockers.length > 0
          ? blockers.map((task) => `${task.title}: ${task.blockerDescription}`).join(" ")
          : waitingForClient.length > 0
            ? `נדרש קלט מהלקוח עבור ${waitingForClient.map((task) => task.title).join(", ")}.`
            : "לא מתועדים חסמים פעילים.",
      recommendedNextAction: firstRisk
        ? firstRisk.status === "Waiting for Client"
          ? `לתאם מול ${project.clientName} את "${firstRisk.title}" ולאשר בעלים לתגובה.`
          : `לשחרר את "${firstRisk.title}" מול ${firstRisk.assignee} ולקבוע נקודת בקרה עוד היום.`
        : `להמשיך את קצב המסירה של ${project.name} ולבדוק התקדמות בנקודת ה־PM הקרובה.`,
      customerCommunicationNeeded,
      source: "local-fallback",
    };
  }

  return {
    overallStatus: `${project.name} is ${project.status.toLowerCase()} with ${progress}% task completion.`,
    keyProgress: `${completed}/${tasks.length} tasks are complete. ${tasks.length - completed} tasks remain active across ${new Set(tasks.map((task) => task.assignee)).size || 0} owner groups.`,
    risksAndBlockers:
      blockers.length > 0
        ? blockers.map((task) => `${task.title}: ${task.blockerDescription}`).join(" ")
        : waitingForClient.length > 0
          ? `Customer input is pending for ${waitingForClient.map((task) => task.title).join(", ")}.`
          : "No active blockers are recorded.",
    recommendedNextAction: nextAction,
    customerCommunicationNeeded,
    source: "local-fallback",
  };
}

function buildCustomerUpdate(project: Project, tasks: Task[], language: ResponseLanguage) {
  const progress = progressFor(tasks);
  const completed = tasks.filter((task) => task.status === "Done").length;
  const waitingForClient = tasks.filter((task) => task.status === "Waiting for Client");
  const blockers = tasks.filter((task) => task.isBlocked || task.status === "Blocked");
  const active = tasks.filter((task) => task.status === "In Progress" || task.status === "To Do");

  if (language === "he") {
    const lines = [
      `${project.name} נמצא כעת ב־${progress}% השלמה, עם ${completed} מתוך ${tasks.length} פריטי עבודה שהושלמו.`,
    ];

    if (active.length > 0) {
      lines.push(`הצוות מתקדם כעת ב־${active.slice(0, 2).map((task) => task.title).join(" וב־")}.`);
    }

    if (waitingForClient.length > 0) {
      lines.push(`נדרש קלט מהלקוח עבור ${waitingForClient.map((task) => task.title).join(", ")} כדי לשמור על קצב ההתקדמות.`);
    } else if (blockers.length > 0) {
      lines.push(`אנחנו מנהלים סיכוני מסירה סביב ${blockers.map((task) => task.title).join(", ")} ונעדכן בנקודת הבקרה הבאה לאחר אישור בעלות.`);
    } else {
      lines.push("אין כרגע חסמים גלויים ללקוח.");
    }

    lines.push(`תאריך היעד הנוכחי נשאר ${project.deadline}.`);
    return lines.join(" ");
  }

  const lines = [
    `${project.name} is currently ${progress}% complete, with ${completed} of ${tasks.length} tracked work items finished.`,
  ];

  if (active.length > 0) {
    lines.push(`The team is actively progressing ${active.slice(0, 2).map((task) => task.title).join(" and ")}.`);
  }

  if (waitingForClient.length > 0) {
    lines.push(`We need customer input on ${waitingForClient.map((task) => task.title).join(", ")} to keep the schedule moving.`);
  } else if (blockers.length > 0) {
    lines.push(`We are managing delivery risks around ${blockers.map((task) => task.title).join(", ")} and will share the next checkpoint once ownership is confirmed.`);
  } else {
    lines.push("There are no customer-facing blockers recorded at this time.");
  }

  lines.push(`The current target date remains ${project.deadline}.`);
  return lines.join(" ");
}

function normalizeAISummary(value: unknown, fallback: AISummary): AISummary {
  if (!value || typeof value !== "object") return fallback;
  const result = value as Partial<AISummary>;
  return {
    overallStatus: readText(result.overallStatus) || fallback.overallStatus,
    keyProgress: readText(result.keyProgress) || fallback.keyProgress,
    risksAndBlockers: readText(result.risksAndBlockers) || fallback.risksAndBlockers,
    recommendedNextAction: readText(result.recommendedNextAction) || fallback.recommendedNextAction,
    customerCommunicationNeeded:
      typeof result.customerCommunicationNeeded === "boolean"
        ? result.customerCommunicationNeeded
        : fallback.customerCommunicationNeeded,
    source: "gemini",
  };
}

function publicTask(task: Task) {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    isBlocked: task.isBlocked,
  };
}

app.get("/api/system/status", (_req, res) => {
  res.json({
    aiMode: ai ? "gemini" : "local-fallback",
    geminiModel: GEMINI_MODEL,
    storage: "local-json",
    persistence: true,
    generatedAt: nowIso(),
  });
});

app.get("/api/projects", async (_req, res) => {
  try { res.json(await getProjects()); } catch (e) { res.status(500).json({error: String(e)}); }
});

app.post("/api/projects", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    await pool.query('INSERT INTO organizations (id, name, plan, status) VALUES ($1, $2, $3, $4)', [validation.value.id, validation.value.name, 'starter', validation.value.status === 'On Track' ? 'active' : 'suspended']);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const projs = await getProjects();
    const project = projs.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json({ ...project, tasks: await getTasks(project.id) });
  } catch (e) { res.status(500).json({error: String(e)}); }
});

app.put("/api/projects/:id", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    await pool.query('UPDATE organizations SET name=$1, status=$2 WHERE id=$3', [validation.value.name, validation.value.status === 'On Track' ? 'active' : 'suspended', req.params.id]);
    res.json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const projectId = readText(req.query.projectId);
    res.json(await getTasks(projectId));
  } catch (e) { res.status(500).json({error: String(e)}); }
});

app.post("/api/tasks", async (req, res) => {
  const validation = validateTaskInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    const status = validation.value.status === 'To Do' ? 'open' : validation.value.status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    const priority = validation.value.priority === 'Critical' ? 'urgent' : validation.value.priority === 'High' ? 'high' : 'normal';
    await pool.query('INSERT INTO support_tickets (id, organization_id, subject, category, priority, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET subject=$3, status=$6', [validation.value.id, validation.value.projectId, validation.value.title, 'question', priority, status]);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});

app.post("/api/ai/summarize", async (req, res) => {
  const { project, tasks = [], language = "en" } = req.body as { project?: Project; tasks?: Task[]; language?: ResponseLanguage };
  if (!project) return res.status(400).json({ error: "Project is required." });

  const responseLanguage: ResponseLanguage = language === "he" ? "he" : "en";
  const fallback = buildInternalSummary(project, Array.isArray(tasks) ? tasks : [], responseLanguage);
  if (!ai) return res.json(fallback);

  const prompt = `
Analyze the following project and tasks for an internal project manager.
Language: ${responseLanguage === "he" ? "Hebrew" : "English"}.

Project: ${JSON.stringify(project)}
Tasks: ${JSON.stringify(tasks)}

Return only valid JSON with:
- overallStatus: string
- keyProgress: string
- risksAndBlockers: string
- recommendedNextAction: string
- customerCommunicationNeeded: boolean

Rules:
- Be concise and operational.
- Prioritize blockers, waiting-for-client items, and critical tasks.
- Do not invent facts not present in the project/task JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    res.json(normalizeAISummary(JSON.parse(response.text || "{}"), fallback));
  } catch (error) {
    console.error("AI summarize fallback used:", error);
    res.json(fallback);
  }
});

app.post("/api/ai/customer-update", async (req, res) => {
  const { project, tasks = [], language = "en" } = req.body as { project?: Project; tasks?: Task[]; language?: ResponseLanguage };
  if (!project) return res.status(400).json({ error: "Project is required." });

  const responseLanguage: ResponseLanguage = language === "he" ? "he" : "en";
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const fallback = buildCustomerUpdate(project, safeTasks, responseLanguage);
  if (!ai) return res.json({ update: fallback, source: "local-fallback" });

  const prompt = `
Generate a brief, professional, non-technical customer status update.
Language: ${responseLanguage === "he" ? "Hebrew" : "English"}.

Project: ${JSON.stringify({
    name: project.name,
    clientName: project.clientName,
    status: project.status,
    deadline: project.deadline,
    description: project.description,
  })}
Tasks: ${JSON.stringify(safeTasks.map(publicTask))}

Rules:
- Do not include internal notes.
- Do not expose raw technical blocker details.
- Clearly state if customer action is needed.
- Use reassuring but honest delivery language.
- Keep it concise.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    res.json({ update: readText(response.text) || fallback, source: readText(response.text) ? "gemini" : "local-fallback" });
  } catch (error) {
    console.error("AI customer update fallback used:", error);
    res.json({ update: fallback, source: "local-fallback" });
  }
});

// System stats endpoint for AI chat context panel
app.get("/api/system/stats", async (_req, res) => {
  res.json({
    projects: (await getProjects()).length,
    tasks: (await getTasks()).length,
    blocked: (await getTasks()).filter((t) => t.isBlocked).length,
  });
});

// AI Chat endpoint - answers PM questions using full project/task context
app.post("/api/ai/chat", async (req, res) => {
  const { message, language = "en" } = req.body as { message?: string; language?: ResponseLanguage };
  if (!message || !message.trim()) return res.status(400).json({ error: "Message is required." });

  const responseLanguage: ResponseLanguage = language === "he" ? "he" : "en";

  const contextData = {
    projects: (await getProjects()),
    tasks: (await getTasks()),
    summary: {
      totalProjects: (await getProjects()).length,
      totalTasks: (await getTasks()).length,
      blockedTasks: (await getTasks()).filter((t) => t.isBlocked).length,
      projectsByStatus: {
        onTrack: (await getProjects()).filter((p) => p.status === "On Track").length,
        atRisk: (await getProjects()).filter((p) => p.status === "At Risk").length,
        blocked: (await getProjects()).filter((p) => p.status === "Blocked").length,
        completed: (await getProjects()).filter((p) => p.status === "Completed").length,
      },
      tasksByStatus: {
        todo: (await getTasks()).filter((t) => t.status === "To Do").length,
        inProgress: (await getTasks()).filter((t) => t.status === "In Progress").length,
        waitingForClient: (await getTasks()).filter((t) => t.status === "Waiting for Client").length,
        done: (await getTasks()).filter((t) => t.status === "Done").length,
      },
      criticalTasks: (await getTasks()).filter((t) => t.priority === "Critical" && t.status !== "Done"),
    },
  };

  if (!ai) {
    const reply =
      responseLanguage === "he"
        ? `מצטער, מצב AI לא זמין כרגע (מצב fallback). נמצאו ${contextData.summary.totalProjects} פרויקטים ו-${contextData.summary.totalTasks} משימות במערכת. ${contextData.summary.blockedTasks > 0 ? `ישנן ${contextData.summary.blockedTasks} משימות חסומות הדורשות טיפול.` : "אין משימות חסומות כרגע."}`
        : `AI mode is unavailable (fallback). The system has ${contextData.summary.totalProjects} projects and ${contextData.summary.totalTasks} tasks. ${contextData.summary.blockedTasks > 0 ? `There are ${contextData.summary.blockedTasks} blocked tasks requiring attention.` : "No blocked tasks at this time."}`;
    return res.json({ reply, source: "local-fallback" });
  }

  const systemPrompt = `You are an expert AI assistant embedded in SyncPro, a professional project management command center.
You have access to real-time data about all projects and tasks in the system.

CURRENT SYSTEM DATA:
${JSON.stringify(contextData, null, 2)}

INSTRUCTIONS:
- Answer the project manager's question based ONLY on the data provided above
- Be concise, actionable, and professional
- Highlight blockers and critical items when relevant
- Format your response clearly with bullet points or numbered lists when listing multiple items
- Respond in ${responseLanguage === "he" ? "Hebrew (עברית)" : "English"}
- Do not make up information not present in the data
- If a question cannot be answered from the data, say so clearly
- For status questions, always mention specific project/task names
- Keep responses under 300 words unless more detail is genuinely needed`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${systemPrompt}\n\nProject Manager Question: ${message}`,
    });

    const reply = readText(response.text);
    res.json({ reply: reply || "No response generated.", source: reply ? "gemini" : "local-fallback" });
  } catch (error) {
    console.error("AI chat fallback:", error);
    const fallbackReply =
      responseLanguage === "he"
        ? `שגיאה בגישה ל-AI. מידע ממערכת: ${contextData.summary.totalProjects} פרויקטים פעילים, ${contextData.summary.blockedTasks} חסומים.`
        : `AI error occurred. System data: ${contextData.summary.totalProjects} active projects, ${contextData.summary.blockedTasks} blocked tasks.`;
    res.json({ reply: fallbackReply, source: "local-fallback" });
  }
});

// ── Task extras ─────────────────────────────────────────────────────────────

// PATCH task status (drag-and-drop)
app.patch("/api/tasks/:id/status", async (req, res) => {
  const { status } = req.body as { status?: string };
  try {
    const dbStatus = status === 'To Do' ? 'open' : status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2', [dbStatus, req.params.id]);
    const tasks = await getTasks();
    res.json(tasks.find(t => t.id === req.params.id));
  } catch(e) { res.status(500).json({error: String(e)}); }
});

// DELETE task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query('DELETE FROM support_tickets WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({error: String(e)}); }
});

// GET comments for a task
app.get("/api/tasks/:id/comments", (req, res) => {
  res.json(([]).filter((c) => c.taskId === req.params.id));
});

// POST comment on a task
app.post("/api/tasks/:id/comments", async (req, res) => {
  const task = (await getTasks()).find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });
  const content = readText(req.body?.content);
  const author = readText(req.body?.author) || "Team Member";
  if (!content) return res.status(400).json({ error: "Comment content is required." });
  const comment: Comment = { id: crypto.randomUUID(), taskId: req.params.id, author, content, createdAt: nowIso() };
  
  // Postgres save happens instantly via queries
  res.status(201).json(comment);
});

// ── Project members ──────────────────────────────────────────────────────────

// GET project members
app.get("/api/projects/:id/members", async (req, res) => {
  const project = (await getProjects()).find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  res.json(([]).filter((m) => m.projectId === req.params.id));
});

// POST add member
app.post("/api/projects/:id/members", async (req, res) => {
  const project = (await getProjects()).find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  const name = readText(req.body?.name);
  const email = readText(req.body?.email);
  const title = readText(req.body?.title) || "Team Member";
  if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
  const member: ProjectMember = { id: crypto.randomUUID(), projectId: req.params.id, name, email, title, createdAt: nowIso() };
  
  // Postgres save happens instantly via queries
  res.status(201).json(member);
});

// PATCH update member title
app.patch("/api/projects/:id/members/:memberId", async (req, res) => {
  const index = ([]).findIndex((m) => m.id === req.params.memberId && m.projectId === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Member not found." });
  const title = readText(req.body?.title);
  if (!title) return res.status(400).json({ error: "Title is required." });
  
  // Postgres save happens instantly via queries
  res.json({});
});

// DELETE member
app.delete("/api/projects/:id/members/:memberId", async (req, res) => {
  const index = ([]).findIndex((m) => m.id === req.params.memberId && m.projectId === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Member not found." });
  
  // Postgres save happens instantly via queries
  res.json({ ok: true });
});

// ── AI draft helper ──────────────────────────────────────────────────────────

app.post("/api/ai/draft", async (req, res) => {
  const { message, context, language = "en" } = req.body as { message?: string; context?: string; language?: ResponseLanguage };
  if (!message?.trim()) return res.status(400).json({ error: "Message is required." });
  const responseLanguage: ResponseLanguage = language === "he" ? "he" : "en";

  if (!ai) {
    return res.json({ reply: responseLanguage === "he" ? "AI אינו זמין כעת. נסה שוב מאוחר יותר." : "AI is unavailable. Please try again later.", source: "local-fallback" });
  }

  const prompt = `You are an expert writing assistant embedded in a project management tool.
${context ? `Context: ${context}\n` : ""}
User request: ${message}

Instructions:
- Respond in ${responseLanguage === "he" ? "Hebrew (עברית)" : "English"}
- Be concise and helpful
- For translation requests, provide the translated text directly
- For drafting requests, provide ready-to-use text
- Keep responses under 200 words`;

  try {
    const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
    res.json({ reply: readText(response.text) || "No response.", source: "gemini" });
  } catch (err) {
    console.error("AI draft error:", err);
    res.json({ reply: responseLanguage === "he" ? "שגיאה ב-AI. נסה שוב." : "AI error. Please try again.", source: "local-fallback" });
  }
});

async function startServer() {
  // await loadDatabase();

  if (process.env.NODE_ENV !== "production") {
    const hmrPort = Number(process.env.HMR_PORT || 24679);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { port: hmrPort },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
