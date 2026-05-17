import sys

def main():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix getTasks
    old_getTasks = """async function getTasks(projectId?: string): Promise<Task[]> {
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
}"""

    new_getTasks = """async function getTasks(projectId?: string): Promise<Task[]> {
  const result = projectId 
    ? await pool.query('SELECT * FROM support_tickets WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 200', [projectId])
    : await pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 200');
  
  return result.rows.map(t => ({
    id: t.id,
    projectId: t.organization_id,
    title: t.subject,
    description: `Category: ${t.category}`,
    assignee: 'Agent',
    status: t.status === 'open' ? 'To Do' : (t.status === 'waiting_on_engineering' ? 'In Progress' : (t.status === 'waiting_on_customer' ? 'Waiting for Client' : (t.status === 'closed' ? 'Blocked' : 'Done'))),
    priority: t.priority === 'urgent' ? 'Critical' : (t.priority === 'high' ? 'High' : (t.priority === 'normal' ? 'Medium' : 'Low')),
    dueDate: t.created_at.toISOString().split('T')[0],
    isBlocked: t.status === 'closed',
    blockerDescription: '',
    internalNotes: '',
    createdAt: t.created_at.toISOString(),
    updatedAt: t.created_at.toISOString()
  }));
}"""
    
    content = content.replace(old_getTasks, new_getTasks)

    # Fix validateTaskInput
    old_validateTaskInput = """  const description = readText(source.description);
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
  if (!dueDate) details.dueDate = "A valid task due date is required.";"""

    new_validateTaskInput = """  const description = typeof source.description === 'string' ? source.description : "No description provided";
  const assignee = typeof source.assignee === 'string' ? source.assignee : "Unassigned";
  const dueDate = readDate(source.dueDate);
  const status = source.status;
  const priority = source.priority;

  if (!projectId) details.projectId = "Parent project is required.";
  if (!title) details.title = "Task title is required.";
  if (!dueDate) details.dueDate = "A valid task due date is required.";"""
    content = content.replace(old_validateTaskInput, new_validateTaskInput)

    # Fix post task
    old_post = """app.post("/api/tasks", async (req, res) => {
  const validation = validateTaskInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    const status = validation.value.status === 'To Do' ? 'open' : validation.value.status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    const priority = validation.value.priority === 'Critical' ? 'urgent' : validation.value.priority === 'High' ? 'high' : 'normal';
    await pool.query('INSERT INTO support_tickets (id, organization_id, subject, category, priority, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET subject=$3, status=$6', [validation.value.id, validation.value.projectId, validation.value.title, 'question', priority, status]);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});"""
    new_post = """app.post("/api/tasks", async (req, res) => {
  const validation = validateTaskInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    const s = validation.value.status;
    const dbStatus = s === 'To Do' ? 'open' : s === 'In Progress' ? 'waiting_on_engineering' : s === 'Waiting for Client' ? 'waiting_on_customer' : s === 'Blocked' ? 'closed' : 'resolved';
    const priority = validation.value.priority === 'Critical' ? 'urgent' : validation.value.priority === 'High' ? 'high' : 'normal';
    await pool.query('INSERT INTO support_tickets (id, organization_id, subject, category, priority, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET subject=$3, status=$6', [validation.value.id, validation.value.projectId, validation.value.title, 'question', priority, dbStatus]);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});"""
    content = content.replace(old_post, new_post)

    # Fix patch task status
    old_patch = """app.patch("/api/tasks/:id/status", async (req, res) => {
  const { status } = req.body as { status?: string };
  try {
    const dbStatus = status === 'To Do' ? 'open' : status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2', [dbStatus, req.params.id]);
    const tasks = await getTasks();
    res.json(tasks.find(t => t.id === req.params.id));
  } catch(e) { res.status(500).json({error: String(e)}); }
});"""
    new_patch = """app.patch("/api/tasks/:id/status", async (req, res) => {
  const { status } = req.body as { status?: string };
  try {
    const s = status;
    const dbStatus = s === 'To Do' ? 'open' : s === 'In Progress' ? 'waiting_on_engineering' : s === 'Waiting for Client' ? 'waiting_on_customer' : s === 'Blocked' ? 'closed' : 'resolved';
    await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2', [dbStatus, req.params.id]);
    const tasks = await getTasks();
    res.json(tasks.find(t => t.id === req.params.id));
  } catch(e) { res.status(500).json({error: String(e)}); }
});"""
    content = content.replace(old_patch, new_patch)

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done")

if __name__ == '__main__':
    main()
