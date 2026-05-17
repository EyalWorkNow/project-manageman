import re
import os

with open('server.ts', 'r') as f:
    content = f.read()

# Add import pg
content = content.replace('import express from "express";', 'import express from "express";\nimport { Pool } from "pg";')

# Add pool initialization
pool_init = """
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
    status: org.status === 'active' ? 'On Track' : (org.status === 'suspended' ? 'Blocked' : 'Done'),
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
"""

content = content.replace('let db: Database = createSeedDatabase();', pool_init)

# Remove load/save database calls
content = re.sub(r'async function loadDatabase\(\).*?^}', '', content, flags=re.MULTILINE|re.DOTALL)
content = re.sub(r'async function saveDatabase\(\).*?^}', '', content, flags=re.MULTILINE|re.DOTALL)
content = re.sub(r'function createSeedDatabase\(\).*?^}', '', content, flags=re.MULTILINE|re.DOTALL)

# Replace endpoints
content = re.sub(r'app\.get\("/api/projects", \(_req, res\) => {.*?}\);', 
'''app.get("/api/projects", async (_req, res) => {
  try { res.json(await getProjects()); } catch (e) { res.status(500).json({error: String(e)}); }
});''', content, flags=re.MULTILINE|re.DOTALL)

content = re.sub(r'app\.get\("/api/projects/:id", \(req, res\) => {.*?}\);', 
'''app.get("/api/projects/:id", async (req, res) => {
  try {
    const projs = await getProjects();
    const project = projs.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json({ ...project, tasks: await getTasks(project.id) });
  } catch (e) { res.status(500).json({error: String(e)}); }
});''', content, flags=re.MULTILINE|re.DOTALL)

content = re.sub(r'app\.get\("/api/tasks", \(req, res\) => {.*?}\);', 
'''app.get("/api/tasks", async (req, res) => {
  try {
    const projectId = readText(req.query.projectId);
    res.json(await getTasks(projectId));
  } catch (e) { res.status(500).json({error: String(e)}); }
});''', content, flags=re.MULTILINE|re.DOTALL)

# For AI endpoints, replace db.projects / db.tasks with await calls
content = content.replace('db.projects', '(await getProjects())')
content = content.replace('db.tasks', '(await getTasks())')
content = content.replace('await saveDatabase();', '// Postgres save happens instantly via queries')

# We'll just leave POST/PUT/DELETE throwing 501 Not Implemented or doing nothing for now if it's too hard to map,
# OR we map them to INSERT/UPDATE statements! Let's map them.
post_project_replacement = '''app.post("/api/projects", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    await pool.query('INSERT INTO organizations (id, name, plan, status) VALUES ($1, $2, $3, $4)', [validation.value.id, validation.value.name, 'starter', validation.value.status === 'On Track' ? 'active' : 'suspended']);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});'''
content = re.sub(r'app\.post\("/api/projects", async \(req, res\) => {.*?}\);', post_project_replacement, content, flags=re.MULTILINE|re.DOTALL)

put_project_replacement = '''app.put("/api/projects/:id", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    await pool.query('UPDATE organizations SET name=$1, status=$2 WHERE id=$3', [validation.value.name, validation.value.status === 'On Track' ? 'active' : 'suspended', req.params.id]);
    res.json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});'''
content = re.sub(r'app\.put\("/api/projects/:id", async \(req, res\) => {.*?}\);', put_project_replacement, content, flags=re.MULTILINE|re.DOTALL)

post_task_replacement = '''app.post("/api/tasks", async (req, res) => {
  const validation = validateTaskInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    const status = validation.value.status === 'To Do' ? 'open' : validation.value.status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    const priority = validation.value.priority === 'Critical' ? 'urgent' : validation.value.priority === 'High' ? 'high' : 'normal';
    await pool.query('INSERT INTO support_tickets (id, organization_id, subject, category, priority, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET subject=$3, status=$6', [validation.value.id, validation.value.projectId, validation.value.title, 'question', priority, status]);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});'''
content = re.sub(r'app\.post\("/api/tasks", async \(req, res\) => {.*?}\);', post_task_replacement, content, flags=re.MULTILINE|re.DOTALL)

patch_task_replacement = '''app.patch("/api/tasks/:id/status", async (req, res) => {
  const { status } = req.body as { status?: string };
  try {
    const dbStatus = status === 'To Do' ? 'open' : status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2', [dbStatus, req.params.id]);
    const tasks = await getTasks();
    res.json(tasks.find(t => t.id === req.params.id));
  } catch(e) { res.status(500).json({error: String(e)}); }
});'''
content = re.sub(r'app\.patch\("/api/tasks/:id/status", async \(req, res\) => {.*?}\);', patch_task_replacement, content, flags=re.MULTILINE|re.DOTALL)

del_task_replacement = '''app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query('DELETE FROM support_tickets WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({error: String(e)}); }
});'''
content = re.sub(r'app\.delete\("/api/tasks/:id", async \(req, res\) => {.*?}\);', del_task_replacement, content, flags=re.MULTILINE|re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)

