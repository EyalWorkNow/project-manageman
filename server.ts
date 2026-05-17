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
  type GanttActivityItem,
  type GanttMilestone,
  type GanttProjectHealth,
  type GanttResourceLoad,
  type GanttTimelineTask,
  type Project,
  type ProjectGanttData,
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

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function mapDbProjectStatus(status: string): ProjectStatus {
  switch (status) {
    case "completed":
    case "archived":
      return "Completed";
    case "on_hold":
    case "cancelled":
      return "Blocked";
    case "draft":
      return "At Risk";
    default:
      return "On Track";
  }
}

function mapUiProjectStatus(status: ProjectStatus) {
  switch (status) {
    case "Completed":
      return "completed";
    case "Blocked":
      return "on_hold";
    case "At Risk":
      return "planning";
    default:
      return "active";
  }
}

function mapDbTaskStatus(status: string): TaskStatus {
  switch (status) {
    case "done":
      return "Done";
    case "blocked":
      return "Blocked";
    case "in_review":
      return "Waiting for Client";
    case "cancelled":
      return "Blocked";
    case "in_progress":
      return "In Progress";
    default:
      return "To Do";
  }
}

function mapUiTaskStatus(status: TaskStatus) {
  switch (status) {
    case "Done":
      return "done";
    case "Blocked":
      return "blocked";
    case "Waiting for Client":
      return "in_review";
    case "In Progress":
      return "in_progress";
    default:
      return "ready";
  }
}

function mapDbPriority(priority: string): TaskPriority {
  switch (priority) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
}

function mapUiPriority(priority: TaskPriority) {
  switch (priority) {
    case "Critical":
      return "critical";
    case "High":
      return "high";
    case "Low":
      return "low";
    default:
      return "medium";
  }
}

function taskProgressForStatus(status: TaskStatus, existing?: number) {
  if (typeof existing === "number" && existing >= 0 && existing <= 100) return existing;
  switch (status) {
    case "Done":
      return 100;
    case "Waiting for Client":
      return 75;
    case "In Progress":
      return 55;
    case "Blocked":
      return 35;
    default:
      return 0;
  }
}

function slugPrefix(input: string) {
  const normalized = input.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (normalized.slice(0, 4) || "PROJ").padEnd(4, "X");
}

async function refreshProjectProgress(projectId: string) {
  await pool.query(
    `
      UPDATE work_projects p
      SET
        progress_percent = COALESCE((
          SELECT ROUND(AVG(t.progress_percent), 2)
          FROM gantt_tasks t
          WHERE t.project_id = p.id
        ), 0),
        consumed_hours = COALESCE((
          SELECT ROUND(SUM(t.logged_hours), 2)
          FROM gantt_tasks t
          WHERE t.project_id = p.id
        ), 0),
        updated_at = NOW()
      WHERE p.id = $1
    `,
    [projectId],
  );
}

async function getDefaultOrgContext() {
  const { rows } = await pool.query(
    `
      SELECT
        o.id,
        o.slug,
        o.name,
        (SELECT c.id FROM work_calendars c WHERE c.org_id = o.id ORDER BY c.created_at ASC LIMIT 1) AS calendar_id,
        (SELECT t.id FROM teams t WHERE t.org_id = o.id ORDER BY t.created_at ASC LIMIT 1) AS team_id,
        (SELECT u.id FROM users u WHERE u.org_id = o.id AND u.status = 'active' ORDER BY u.created_at ASC LIMIT 1) AS owner_user_id
      FROM organizations o
      ORDER BY o.created_at ASC
      LIMIT 1
    `,
  );

  if (rows.length === 0) {
    throw new Error("No organization data found in the database.");
  }

  return rows[0] as {
    id: string;
    slug: string;
    name: string;
    calendar_id: string | null;
    team_id: string | null;
    owner_user_id: string | null;
  };
}

async function getProjectDbRow(projectId: string) {
  const { rows } = await pool.query(
    `
      SELECT
        p.*,
        o.name AS organization_name,
        o.slug AS organization_slug,
        owner.full_name AS owner_name
      FROM work_projects p
      JOIN organizations o ON o.id = p.org_id
      LEFT JOIN users owner ON owner.id = p.owner_user_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId],
  );

  return rows[0] as
    | (Record<string, unknown> & {
        id: string;
        org_id: string;
        organization_name: string;
        organization_slug: string;
        owner_name: string | null;
        metadata: Record<string, unknown> | null;
      })
    | undefined;
}

function mapProjectRow(row: Record<string, any>): Project {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    name: row.name,
    clientName: readText(metadata.clientName) || row.organization_name,
    description: row.description || "",
    status: mapDbProjectStatus(row.status),
    deadline: toIsoDate(row.target_end_date),
    projectManager: readText(metadata.projectManager) || row.owner_name || "Unassigned",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapTaskRow(row: Record<string, any>): Task {
  const metadata = row.metadata || {};
  const assignee =
    readText(row.assignees) ||
    readText(metadata.rawAssignee) ||
    readText(row.owner_name) ||
    "Unassigned";
  const blockerDescription =
    readText(metadata.blockerDescription) ||
    (row.task_status === "blocked"
      ? row.blocking_dependencies_count > 0
        ? "Task is blocked by an upstream dependency."
        : "Task is currently blocked."
      : "");

  return {
    id: row.task_id,
    projectId: row.project_id,
    title: row.title,
    description: row.description || "",
    assignee,
    status: mapDbTaskStatus(row.task_status),
    priority: mapDbPriority(row.priority),
    dueDate: toIsoDate(row.planned_end_date),
    isBlocked: row.task_status === "blocked",
    blockerDescription,
    internalNotes: readText(metadata.internalNotes),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    startDate: toIsoDate(row.planned_start_date),
    progressPercent: Number(row.progress_percent ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    timelineHealth: row.timeline_health || "",
    isCriticalPath: Boolean(row.is_critical_path),
    taskType: row.task_type || "task",
    baselineStartDate: row.baseline_start_date ? toIsoDate(row.baseline_start_date) : undefined,
    baselineEndDate: row.baseline_end_date ? toIsoDate(row.baseline_end_date) : undefined,
  };
}

async function getProjects(): Promise<Project[]> {
  const { rows } = await pool.query(
    `
      SELECT
        p.*,
        o.name AS organization_name,
        o.slug AS organization_slug,
        owner.full_name AS owner_name
      FROM work_projects p
      JOIN organizations o ON o.id = p.org_id
      LEFT JOIN users owner ON owner.id = p.owner_user_id
      WHERE p.archived_at IS NULL
      ORDER BY p.updated_at DESC
      LIMIT 100
    `,
  );

  return rows.map(mapProjectRow);
}

async function getTasks(projectId?: string): Promise<Task[]> {
  const params: string[] = [];
  const where = projectId ? `WHERE v.project_id = $1` : "";
  if (projectId) params.push(projectId);

  const { rows } = await pool.query(
    `
      SELECT
        v.*,
        t.description,
        t.metadata,
        t.created_at,
        t.updated_at,
        assignees.assignees,
        baseline.baseline_name,
        baseline.baseline_version,
        baseline.baseline_start_date,
        baseline.baseline_end_date
      FROM v_gantt_tasks v
      JOIN gantt_tasks t ON t.id = v.task_id
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(DISTINCT u.full_name, ', ' ORDER BY u.full_name) AS assignees
        FROM gantt_task_assignments a
        JOIN users u ON u.id = a.user_id
        WHERE a.task_id = v.task_id
          AND a.unassigned_at IS NULL
      ) assignees ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          b.baseline_name,
          b.baseline_version,
          b.planned_start_date AS baseline_start_date,
          b.planned_end_date AS baseline_end_date
        FROM gantt_task_baselines b
        WHERE b.task_id = v.task_id
        ORDER BY b.baseline_version DESC
        LIMIT 1
      ) baseline ON TRUE
      ${where}
      ORDER BY v.sort_order ASC, t.created_at ASC
    `,
    params,
  );

  return rows.map(mapTaskRow);
}

async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { rows } = await pool.query(
    `
      SELECT
        u.id,
        pm.project_id,
        u.full_name,
        u.email,
        u.title,
        pm.project_role,
        pm.allocation_percent,
        pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
        AND pm.left_at IS NULL
      ORDER BY
        CASE pm.project_role
          WHEN 'owner' THEN 0
          WHEN 'lead' THEN 1
          WHEN 'contributor' THEN 2
          ELSE 3
        END,
        u.full_name ASC
    `,
    [projectId],
  );

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.full_name,
    email: row.email,
    title: row.title || row.project_role,
    createdAt: new Date(row.joined_at).toISOString(),
    projectRole: row.project_role,
    allocationPercent: Number(row.allocation_percent ?? 0),
  }));
}

async function getProjectGantt(projectId: string): Promise<ProjectGanttData | null> {
  const { rows: healthRows } = await pool.query(
    `
      SELECT
        project_id,
        project_key,
        project_name,
        status,
        priority,
        start_date,
        target_end_date,
        actual_end_date,
        progress_percent,
        total_tasks,
        completed_tasks,
        blocked_tasks,
        overdue_tasks,
        critical_path_tasks,
        earliest_task_start,
        latest_task_end,
        health_status
      FROM v_project_timeline_health
      WHERE project_id = $1
      LIMIT 1
    `,
    [projectId],
  );

  if (healthRows.length === 0) return null;

  const [tasks, milestoneResult, resourceResult, activityResult] = await Promise.all([
    pool.query(
      `
        SELECT
          v.*,
          COALESCE(assignees.assignees, ARRAY[]::TEXT[]) AS assignees,
          baseline.baseline_name,
          baseline.baseline_version,
          baseline.baseline_start_date,
          baseline.baseline_end_date,
          COALESCE(comment_counts.comments_count, 0) AS comments_count
        FROM v_gantt_tasks v
        LEFT JOIN LATERAL (
          SELECT ARRAY_AGG(u.full_name ORDER BY u.full_name) AS assignees
          FROM gantt_task_assignments a
          JOIN users u ON u.id = a.user_id
          WHERE a.task_id = v.task_id
            AND a.unassigned_at IS NULL
        ) assignees ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            b.baseline_name,
            b.baseline_version,
            b.planned_start_date AS baseline_start_date,
            b.planned_end_date AS baseline_end_date
          FROM gantt_task_baselines b
          WHERE b.task_id = v.task_id
          ORDER BY b.baseline_version DESC
          LIMIT 1
        ) baseline ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::INT AS comments_count
          FROM gantt_task_comments c
          WHERE c.task_id = v.task_id
            AND c.deleted_at IS NULL
        ) comment_counts ON TRUE
        WHERE v.project_id = $1
        ORDER BY v.sort_order ASC
      `,
      [projectId],
    ),
    pool.query(
      `
        SELECT
          m.id,
          m.project_id,
          m.milestone_key,
          m.name AS milestone_name,
          m.due_date,
          m.status,
          m.completed_at,
          u.full_name AS owner_name,
          CASE
            WHEN m.status NOT IN ('completed', 'cancelled') AND m.due_date < CURRENT_DATE THEN TRUE
            ELSE FALSE
          END AS is_late
        FROM gantt_milestones m
        LEFT JOIN users u ON u.id = m.owner_user_id
        WHERE m.project_id = $1
        ORDER BY m.due_date ASC
      `,
      [projectId],
    ),
    pool.query(
      `
        SELECT
          rl.user_id,
          rl.full_name,
          rl.department,
          rl.active_projects,
          rl.open_tasks,
          rl.open_task_allocation_percent,
          rl.next_task_start,
          rl.latest_task_end
        FROM v_gantt_resource_load rl
        JOIN project_members pm ON pm.user_id = rl.user_id
        WHERE pm.project_id = $1
          AND pm.left_at IS NULL
        ORDER BY COALESCE(rl.open_task_allocation_percent, 0) DESC, rl.full_name ASC
      `,
      [projectId],
    ),
    pool.query(
      `
        SELECT
          a.id,
          a.task_id,
          t.title AS task_title,
          u.full_name AS actor_name,
          a.event_type,
          a.message,
          a.created_at
        FROM gantt_task_activity a
        LEFT JOIN gantt_tasks t ON t.id = a.task_id
        LEFT JOIN users u ON u.id = a.actor_user_id
        WHERE a.project_id = $1
        ORDER BY a.created_at DESC
        LIMIT 24
      `,
      [projectId],
    ),
  ]);

  const healthRow = healthRows[0];
  return {
    health: {
      projectId: healthRow.project_id,
      projectKey: healthRow.project_key,
      projectName: healthRow.project_name,
      status: healthRow.status,
      priority: healthRow.priority,
      startDate: toIsoDate(healthRow.start_date),
      targetEndDate: toIsoDate(healthRow.target_end_date),
      actualEndDate: healthRow.actual_end_date ? toIsoDate(healthRow.actual_end_date) : null,
      progressPercent: Number(healthRow.progress_percent ?? 0),
      totalTasks: Number(healthRow.total_tasks ?? 0),
      completedTasks: Number(healthRow.completed_tasks ?? 0),
      blockedTasks: Number(healthRow.blocked_tasks ?? 0),
      overdueTasks: Number(healthRow.overdue_tasks ?? 0),
      criticalPathTasks: Number(healthRow.critical_path_tasks ?? 0),
      earliestTaskStart: healthRow.earliest_task_start ? toIsoDate(healthRow.earliest_task_start) : null,
      latestTaskEnd: healthRow.latest_task_end ? toIsoDate(healthRow.latest_task_end) : null,
      healthStatus: healthRow.health_status,
    } satisfies GanttProjectHealth,
    tasks: tasks.rows.map((row) => ({
      taskId: row.task_id,
      projectId: row.project_id,
      taskKey: row.task_key,
      title: row.title,
      taskType: row.task_type,
      taskStatus: row.task_status,
      priority: row.priority,
      plannedStartDate: toIsoDate(row.planned_start_date),
      plannedEndDate: toIsoDate(row.planned_end_date),
      actualStartDate: row.actual_start_date ? toIsoDate(row.actual_start_date) : null,
      actualEndDate: row.actual_end_date ? toIsoDate(row.actual_end_date) : null,
      durationDays: Number(row.duration_days ?? 1),
      progressPercent: Number(row.progress_percent ?? 0),
      estimatedHours: row.estimated_hours === null ? null : Number(row.estimated_hours),
      loggedHours: Number(row.logged_hours ?? 0),
      isCriticalPath: Boolean(row.is_critical_path),
      sortOrder: Number(row.sort_order ?? 0),
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      blockingDependenciesCount: Number(row.blocking_dependencies_count ?? 0),
      dependentTasksCount: Number(row.dependent_tasks_count ?? 0),
      isOverdue: Boolean(row.is_overdue),
      timelineHealth: row.timeline_health,
      assignees: row.assignees || [],
      baselineName: row.baseline_name,
      baselineVersion: row.baseline_version === null ? null : Number(row.baseline_version),
      baselineStartDate: row.baseline_start_date ? toIsoDate(row.baseline_start_date) : null,
      baselineEndDate: row.baseline_end_date ? toIsoDate(row.baseline_end_date) : null,
      commentsCount: Number(row.comments_count ?? 0),
    })) satisfies GanttTimelineTask[],
    milestones: milestoneResult.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      milestoneKey: row.milestone_key,
      milestoneName: row.milestone_name,
      dueDate: toIsoDate(row.due_date),
      status: row.status,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      ownerName: row.owner_name,
      isLate: Boolean(row.is_late),
    })) satisfies GanttMilestone[],
    resources: resourceResult.rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      department: row.department,
      activeProjects: Number(row.active_projects ?? 0),
      openTasks: Number(row.open_tasks ?? 0),
      openTaskAllocationPercent:
        row.open_task_allocation_percent === null ? null : Number(row.open_task_allocation_percent),
      nextTaskStart: row.next_task_start ? toIsoDate(row.next_task_start) : null,
      latestTaskEnd: row.latest_task_end ? toIsoDate(row.latest_task_end) : null,
    })) satisfies GanttResourceLoad[],
    activity: activityResult.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskTitle: row.task_title,
      actorName: row.actor_name,
      eventType: row.event_type,
      message: row.message,
      createdAt: new Date(row.created_at).toISOString(),
    })) satisfies GanttActivityItem[],
  };
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
  const description = typeof source.description === 'string' ? source.description : "No description provided";
  const assignee = typeof source.assignee === 'string' ? source.assignee : "Unassigned";
  const dueDate = readDate(source.dueDate);
  const status = source.status;
  const priority = source.priority;

  if (!projectId) details.projectId = "Parent project is required.";
  if (!title) details.title = "Task title is required.";
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
    storage: "postgres",
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
    const org = await getDefaultOrgContext();
    const { rows } = await pool.query(
      `SELECT COUNT(*)::INT AS count FROM work_projects WHERE org_id = $1`,
      [org.id],
    );
    const sequence = Number(rows[0]?.count ?? 0) + 1;
    const projectKey = `${slugPrefix(org.slug)}-${String(sequence).padStart(3, "0")}`;

    await pool.query(
      `
        INSERT INTO work_projects (
          id, org_id, team_id, calendar_id, name, project_key, description, status,
          priority, owner_user_id, start_date, target_end_date, progress_percent,
          metadata, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'medium', $9, CURRENT_DATE, $10, 0, $11::jsonb, $9, NOW(), NOW())
      `,
      [
        validation.value.id,
        org.id,
        org.team_id,
        org.calendar_id,
        validation.value.name,
        projectKey,
        validation.value.description,
        mapUiProjectStatus(validation.value.status),
        org.owner_user_id,
        validation.value.deadline,
        JSON.stringify({
          clientName: validation.value.clientName,
          projectManager: validation.value.projectManager,
          source: "pm_app",
        }),
      ],
    );

    const created = (await getProjects()).find((project) => project.id === validation.value.id);
    res.status(201).json(created ?? validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const projs = await getProjects();
    const project = projs.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const [tasks, members] = await Promise.all([getTasks(project.id), getProjectMembers(project.id)]);
    res.json({ ...project, tasks, members });
  } catch (e) { res.status(500).json({error: String(e)}); }
});

app.get("/api/projects/:id/gantt", async (req, res) => {
  try {
    const gantt = await getProjectGantt(req.params.id);
    if (!gantt) return res.status(404).json({ error: "Project not found." });
    res.json(gantt);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put("/api/projects/:id", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    const project = await getProjectDbRow(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });

    const metadata = {
      ...(project.metadata || {}),
      clientName: validation.value.clientName,
      projectManager: validation.value.projectManager,
      source: "pm_app",
    };

    await pool.query(
      `
        UPDATE work_projects
        SET
          name = $1,
          description = $2,
          status = $3,
          target_end_date = $4,
          metadata = $5::jsonb,
          updated_at = NOW()
        WHERE id = $6
      `,
      [
        validation.value.name,
        validation.value.description,
        mapUiProjectStatus(validation.value.status),
        validation.value.deadline,
        JSON.stringify(metadata),
        req.params.id,
      ],
    );

    const updated = (await getProjects()).find((item) => item.id === req.params.id);
    res.json(updated ?? validation.value);
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
    const project = await getProjectDbRow(validation.value.projectId);
    if (!project) return res.status(404).json({ error: "Project not found." });

    const { rows: existingRows } = await pool.query(
      `
        SELECT id, project_id, task_key, sort_order, planned_start_date, progress_percent
        FROM gantt_tasks
        WHERE id = $1
        LIMIT 1
      `,
      [validation.value.id],
    );

    const existing = existingRows[0] as
      | {
          id: string;
          project_id: string;
          task_key: string;
          sort_order: number;
          planned_start_date: Date | string;
          progress_percent: number;
        }
      | undefined;

    const assigneeNames = validation.value.assignee
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    const matchedAssignees =
      assigneeNames.length === 0
        ? []
        : (
            await pool.query(
              `
                SELECT DISTINCT u.id, u.full_name
                FROM project_members pm
                JOIN users u ON u.id = pm.user_id
                WHERE pm.project_id = $1
                  AND pm.left_at IS NULL
                  AND LOWER(u.full_name) = ANY($2::text[])
              `,
              [validation.value.projectId, assigneeNames],
            )
          ).rows;

    const taskId = existing?.id || validation.value.id;
    const sortOrder =
      existing?.sort_order ??
      Number(
        (
          await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM gantt_tasks WHERE project_id = $1`, [
            validation.value.projectId,
          ])
        ).rows[0]?.next_sort_order ?? 1,
      );
    const taskKey = existing?.task_key || `${String((project as any).project_key)}-T${String(sortOrder).padStart(3, "0")}`;
    const startDate =
      validation.value.startDate ||
      (existing?.planned_start_date ? toIsoDate(existing.planned_start_date) : validation.value.dueDate);
    const progressPercent = taskProgressForStatus(validation.value.status, validation.value.progressPercent ?? existing?.progress_percent);
    const metadata = {
      internalNotes: validation.value.internalNotes,
      blockerDescription: validation.value.blockerDescription,
      rawAssignee: validation.value.assignee,
      source: "pm_app",
    };

    await pool.query(
      `
        INSERT INTO gantt_tasks (
          id, org_id, project_id, task_key, title, description, task_type, status, priority,
          planned_start_date, planned_end_date, progress_percent, estimated_hours, logged_hours,
          owner_user_id, reporter_user_id, sort_order, is_critical_path, is_locked, metadata,
          created_by, created_at, updated_at, completed_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, 'task', $7, $8, $9, $10, $11, 12, 0,
          $12, $13, $14, FALSE, FALSE, $15::jsonb, $13, NOW(), NOW(),
          CASE WHEN $7 = 'done' THEN NOW() ELSE NULL END
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          planned_start_date = EXCLUDED.planned_start_date,
          planned_end_date = EXCLUDED.planned_end_date,
          progress_percent = EXCLUDED.progress_percent,
          owner_user_id = EXCLUDED.owner_user_id,
          metadata = EXCLUDED.metadata,
          updated_at = NOW(),
          completed_at = CASE WHEN EXCLUDED.status = 'done' THEN NOW() ELSE NULL END
      `,
      [
        taskId,
        project.org_id,
        validation.value.projectId,
        taskKey,
        validation.value.title,
        validation.value.description,
        mapUiTaskStatus(validation.value.status),
        mapUiPriority(validation.value.priority),
        startDate,
        validation.value.dueDate,
        progressPercent,
        matchedAssignees[0]?.id ?? null,
        (project as any).owner_user_id ?? null,
        sortOrder,
        JSON.stringify(metadata),
      ],
    );

    await pool.query(`DELETE FROM gantt_task_assignments WHERE task_id = $1`, [taskId]);

    for (let index = 0; index < matchedAssignees.length; index += 1) {
      const assignee = matchedAssignees[index];
      await pool.query(
        `
          INSERT INTO gantt_task_assignments (
            task_id, user_id, assignment_role, allocation_percent, assigned_by, assigned_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [
          taskId,
          assignee.id,
          index === 0 ? "assignee" : "reviewer",
          index === 0 ? 100 : 25,
          matchedAssignees[0]?.id ?? null,
        ],
      );
    }

    await pool.query(
      `
        INSERT INTO gantt_task_activity (
          project_id, org_id, task_id, actor_user_id, event_type, new_value, message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
      `,
      [
        validation.value.projectId,
        project.org_id,
        taskId,
        matchedAssignees[0]?.id ?? null,
        existing ? "task_updated" : "task_created",
        JSON.stringify({
          status: mapUiTaskStatus(validation.value.status),
          dueDate: validation.value.dueDate,
          assignee: validation.value.assignee,
        }),
        existing ? "Task updated from PM workspace." : "Task created from PM workspace.",
      ],
    );

    await refreshProjectProgress(validation.value.projectId);
    const savedTask = (await getTasks(validation.value.projectId)).find((task) => task.id === taskId);
    res.status(existing ? 200 : 201).json(savedTask ?? validation.value);
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
    if (!isOneOf(TASK_STATUSES, status)) {
      return res.status(400).json({ error: `Status must be one of: ${TASK_STATUSES.join(", ")}.` });
    }

    const { rows } = await pool.query(
      `SELECT id, project_id, progress_percent FROM gantt_tasks WHERE id = $1 LIMIT 1`,
      [req.params.id],
    );
    const task = rows[0];
    if (!task) return res.status(404).json({ error: "Task not found." });

    await pool.query(
      `
        UPDATE gantt_tasks
        SET
          status = $1,
          progress_percent = $2,
          updated_at = NOW(),
          completed_at = CASE WHEN $1 = 'done' THEN NOW() ELSE NULL END
        WHERE id = $3
      `,
      [mapUiTaskStatus(status), taskProgressForStatus(status, Number(task.progress_percent ?? 0)), req.params.id],
    );

    await pool.query(
      `
        INSERT INTO gantt_task_activity (
          project_id, org_id, task_id, event_type, new_value, message, created_at
        )
        SELECT project_id, org_id, id, 'task_status_changed', $1::jsonb, 'Task status updated from board.', NOW()
        FROM gantt_tasks
        WHERE id = $2
      `,
      [JSON.stringify({ status: mapUiTaskStatus(status) }), req.params.id],
    );

    await refreshProjectProgress(task.project_id);
    const updated = (await getTasks(task.project_id)).find((item) => item.id === req.params.id);
    res.json(updated);
  } catch(e) { res.status(500).json({error: String(e)}); }
});

// DELETE task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT project_id FROM gantt_tasks WHERE id = $1 LIMIT 1`, [req.params.id]);
    const task = rows[0];
    if (!task) return res.status(404).json({ error: "Task not found." });
    await pool.query('DELETE FROM gantt_tasks WHERE id=$1', [req.params.id]);
    await refreshProjectProgress(task.project_id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({error: String(e)}); }
});

// GET comments for a task
app.get("/api/tasks/:id/comments", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          c.id,
          c.task_id,
          COALESCE(u.full_name, 'Team Member') AS author,
          c.body AS content,
          c.created_at
        FROM gantt_task_comments c
        LEFT JOIN users u ON u.id = c.author_user_id
        WHERE c.task_id = $1
          AND c.deleted_at IS NULL
        ORDER BY c.created_at ASC
      `,
      [req.params.id],
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        author: row.author,
        content: row.content,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST comment on a task
app.post("/api/tasks/:id/comments", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT t.id, t.project_id, t.org_id
        FROM gantt_tasks t
        WHERE t.id = $1
        LIMIT 1
      `,
      [req.params.id],
    );
    const task = rows[0];
    if (!task) return res.status(404).json({ error: "Task not found." });
    const content = readText(req.body?.content);
    const author = readText(req.body?.author) || "Team Member";
    if (!content) return res.status(400).json({ error: "Comment content is required." });

    const authorLookup = await pool.query(
      `SELECT id FROM users WHERE org_id = $1 AND LOWER(full_name) = LOWER($2) LIMIT 1`,
      [task.org_id, author],
    );
    const authorUserId = authorLookup.rows[0]?.id ?? null;
    const commentId = crypto.randomUUID();

    await pool.query(
      `
        INSERT INTO gantt_task_comments (
          id, org_id, project_id, task_id, author_user_id, body, visibility, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'internal', NOW())
      `,
      [commentId, task.org_id, task.project_id, task.id, authorUserId, content],
    );

    await pool.query(
      `
        INSERT INTO gantt_task_activity (
          project_id, org_id, task_id, actor_user_id, event_type, message, created_at
        )
        VALUES ($1, $2, $3, $4, 'comment_added', $5, NOW())
      `,
      [task.project_id, task.org_id, task.id, authorUserId, content],
    );

    const comment: Comment = { id: commentId, taskId: task.id, author, content, createdAt: nowIso() };
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Project members ──────────────────────────────────────────────────────────

// GET project members
app.get("/api/projects/:id/members", async (req, res) => {
  try {
    const project = await getProjectDbRow(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json(await getProjectMembers(req.params.id));
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});

// POST add member
app.post("/api/projects/:id/members", async (req, res) => {
  try {
    const project = await getProjectDbRow(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const name = readText(req.body?.name);
    const email = readText(req.body?.email);
    const title = readText(req.body?.title) || "Team Member";
    if (!name || !email) return res.status(400).json({ error: "Name and email are required." });

    let userId: string;
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE org_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [project.org_id, email],
    );

    if (existingUser.rows[0]?.id) {
      userId = existingUser.rows[0].id;
      await pool.query(`UPDATE users SET full_name = $1, title = $2, updated_at = NOW() WHERE id = $3`, [name, title, userId]);
    } else {
      userId = crypto.randomUUID();
      await pool.query(
        `
          INSERT INTO users (
            id, org_id, email, full_name, title, department, status, mfa_enabled, locale, created_at, updated_at, metadata
          )
          VALUES ($1, $2, $3, $4, $5, 'Operations', 'active', FALSE, 'en', NOW(), NOW(), '{"source":"pm_app"}'::jsonb)
        `,
        [userId, project.org_id, email, name, title],
      );
    }

    await pool.query(
      `
        INSERT INTO project_members (
          project_id, user_id, project_role, allocation_percent, joined_at, left_at
        )
        VALUES ($1, $2, 'contributor', 35, NOW(), NULL)
        ON CONFLICT (project_id, user_id) DO UPDATE
        SET left_at = NULL, allocation_percent = 35
      `,
      [req.params.id, userId],
    );

    const member = (await getProjectMembers(req.params.id)).find((item) => item.id === userId);
    res.status(201).json(member);
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});

// PATCH update member title
app.patch("/api/projects/:id/members/:memberId", async (req, res) => {
  try {
    const title = readText(req.body?.title);
    if (!title) return res.status(400).json({ error: "Title is required." });

    await pool.query(
      `
        UPDATE users
        SET title = $1, updated_at = NOW()
        WHERE id = $2
          AND org_id = (SELECT org_id FROM work_projects WHERE id = $3)
      `,
      [title, req.params.memberId, req.params.id]
    );

    const member = (await getProjectMembers(req.params.id)).find((item) => item.id === req.params.memberId);
    if (!member) return res.status(404).json({ error: "Member not found." });
    res.json(member);
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});

// DELETE member
app.delete("/api/projects/:id/members/:memberId", async (req, res) => {
  try {
    await pool.query(
      `
        UPDATE project_members
        SET left_at = NOW()
        WHERE project_id = $1 AND user_id = $2
      `,
      [req.params.id, req.params.memberId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
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
