import re

with open('server.ts', 'r') as f:
    text = f.read()

# Fix the dangling lines after app.post("/api/projects", ...)
text = re.sub(
r'''app\.post\("/api/projects", async \(req, res\) => {
  const validation = validateProjectInput\(req\.body\);
  if \(validation\.ok === false\) return res\.status\(400\)\.json\({ error: validation\.error, details: validation\.details }\);
  try {
    await pool\.query\('INSERT INTO organizations \(id, name, plan, status\) VALUES \(\$1, \$2, \$3, \$4\)', \[validation\.value\.id, validation\.value\.name, 'starter', validation\.value\.status === 'On Track' \? 'active' : 'suspended'\]\);
    res\.status\(201\)\.json\(validation\.value\);
  } catch\(e\) { res\.status\(500\)\.json\({error: String\(e\)}\); }
}\);

  \(await getProjects\(\)\)\.push\(validation\.value\);
  // Postgres save happens instantly via queries
  res\.status\(201\)\.json\(validation\.value\);
}\);''',
r'''app.post("/api/projects", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    await pool.query('INSERT INTO organizations (id, name, plan, status) VALUES ($1, $2, $3, $4)', [validation.value.id, validation.value.name, 'starter', validation.value.status === 'On Track' ? 'active' : 'suspended']);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});''', text)

# Fix dangling lines after app.get("/api/projects/:id"
text = re.sub(
r'''app\.get\("/api/projects/:id", async \(req, res\) => {
  try {
    const projs = await getProjects\(\);
    const project = projs\.find\(p => p\.id === req\.params\.id\);
    if \(!project\) return res\.status\(404\)\.json\({ error: "Project not found\." }\);
    res\.json\({ \.\.\.project, tasks: await getTasks\(project\.id\) }\);
  } catch \(e\) { res\.status\(500\)\.json\({error: String\(e\)}\); }
}\);
  res\.json\({ \.\.\.project, tasks: projectTasks\(project\.id\) }\);
}\);''',
r'''app.get("/api/projects/:id", async (req, res) => {
  try {
    const projs = await getProjects();
    const project = projs.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json({ ...project, tasks: await getTasks(project.id) });
  } catch (e) { res.status(500).json({error: String(e)}); }
});''', text)

# Fix dangling lines after app.put("/api/projects/:id"
text = re.sub(
r'''app\.put\("/api/projects/:id", async \(req, res\) => {
  const validation = validateProjectInput\(req\.body\);
  if \(validation\.ok === false\) return res\.status\(400\)\.json\({ error: validation\.error, details: validation\.details }\);
  try {
    await pool\.query\('UPDATE organizations SET name=\$1, status=\$2 WHERE id=\$3', \[validation\.value\.name, validation\.value\.status === 'On Track' \? 'active' : 'suspended', req\.params\.id\]\);
    res\.json\(validation\.value\);
  } catch\(e\) { res\.status\(500\)\.json\({error: String\(e\)}\); }
}\);

  const validation = validateProjectInput\(req\.body, \(await getProjects\(\)\)\[index\]\);
  if \(validation\.ok === false\) return res\.status\(400\)\.json\({ error: validation\.error, details: validation\.details }\);

  \(await getProjects\(\)\)\[index\] = validation\.value;
  // Postgres save happens instantly via queries
  res\.json\(validation\.value\);
}\);''',
r'''app.put("/api/projects/:id", async (req, res) => {
  const validation = validateProjectInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    await pool.query('UPDATE organizations SET name=$1, status=$2 WHERE id=$3', [validation.value.name, validation.value.status === 'On Track' ? 'active' : 'suspended', req.params.id]);
    res.json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});''', text)

# Fix dangling lines after app.post("/api/tasks"
text = re.sub(
r'''app\.post\("/api/tasks", async \(req, res\) => {
  const validation = validateTaskInput\(req\.body\);
  if \(validation\.ok === false\) return res\.status\(400\)\.json\({ error: validation\.error, details: validation\.details }\);
  try {
    const status = validation\.value\.status === 'To Do' \? 'open' : validation\.value\.status === 'In Progress' \? 'waiting_on_engineering' : 'resolved';
    const priority = validation\.value\.priority === 'Critical' \? 'urgent' : validation\.value\.priority === 'High' \? 'high' : 'normal';
    await pool\.query\('INSERT INTO support_tickets \(id, organization_id, subject, category, priority, status\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6\) ON CONFLICT \(id\) DO UPDATE SET subject=\$3, status=\$6', \[validation\.value\.id, validation\.value\.projectId, validation\.value\.title, 'question', priority, status\]\);
    res\.status\(201\)\.json\(validation\.value\);
  } catch\(e\) { res\.status\(500\)\.json\({error: String\(e\)}\); }
}\);

  if \(existingIndex >= 0\) {
    \(await getTasks\(\)\)\[existingIndex\] = validation\.value;
    // Postgres save happens instantly via queries
    return res\.json\(validation\.value\);
  }

  \(await getTasks\(\)\)\.push\(validation\.value\);
  // Postgres save happens instantly via queries
  res\.status\(201\)\.json\(validation\.value\);
}\);''',
r'''app.post("/api/tasks", async (req, res) => {
  const validation = validateTaskInput(req.body);
  if (validation.ok === false) return res.status(400).json({ error: validation.error, details: validation.details });
  try {
    const status = validation.value.status === 'To Do' ? 'open' : validation.value.status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    const priority = validation.value.priority === 'Critical' ? 'urgent' : validation.value.priority === 'High' ? 'high' : 'normal';
    await pool.query('INSERT INTO support_tickets (id, organization_id, subject, category, priority, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET subject=$3, status=$6', [validation.value.id, validation.value.projectId, validation.value.title, 'question', priority, status]);
    res.status(201).json(validation.value);
  } catch(e) { res.status(500).json({error: String(e)}); }
});''', text)

# Fix patch tasks
text = re.sub(
r'''app\.patch\("/api/tasks/:id/status", async \(req, res\) => {
  const { status } = req\.body as { status\?: string };
  try {
    const dbStatus = status === 'To Do' \? 'open' : status === 'In Progress' \? 'waiting_on_engineering' : 'resolved';
    await pool\.query\('UPDATE support_tickets SET status=\$1 WHERE id=\$2', \[dbStatus, req\.params\.id\]\);
    const tasks = await getTasks\(\);
    res\.json\(tasks\.find\(t => t\.id === req\.params\.id\)\);
  } catch\(e\) { res\.status\(500\)\.json\({error: String\(e\)}\); }
}\);
  if \(!isOneOf\(TASK_STATUSES, status\)\) {
    return res\.status\(400\)\.json\({ error: `Status must be one of: \${TASK_STATUSES\.join\(", "\)}\.` }\);
  }
  const task = \(await getTasks\(\)\)\[index\];
  \(await getTasks\(\)\)\[index\] = {
    \.\.\.task,
    status: status as TaskStatus,
    isBlocked: status === "Blocked",
    updatedAt: nowIso\(\),
  };
  // Postgres save happens instantly via queries
  res\.json\(\(await getTasks\(\)\)\[index\]\);
}\);''',
r'''app.patch("/api/tasks/:id/status", async (req, res) => {
  const { status } = req.body as { status?: string };
  try {
    const dbStatus = status === 'To Do' ? 'open' : status === 'In Progress' ? 'waiting_on_engineering' : 'resolved';
    await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2', [dbStatus, req.params.id]);
    const tasks = await getTasks();
    res.json(tasks.find(t => t.id === req.params.id));
  } catch(e) { res.status(500).json({error: String(e)}); }
});''', text)

# Fix delete tasks
text = re.sub(
r'''app\.delete\("/api/tasks/:id", async \(req, res\) => {
  try {
    await pool\.query\('DELETE FROM support_tickets WHERE id=\$1', \[req\.params\.id\]\);
    res\.json\({ ok: true }\);
  } catch\(e\) { res\.status\(500\)\.json\({error: String\(e\)}\); }
}\);
  \(await getTasks\(\)\)\.splice\(index, 1\);
  db\.comments = db\.comments\.filter\(\(c\) => c\.taskId !== req\.params\.id\);
  // Postgres save happens instantly via queries
  res\.json\({ ok: true }\);
}\);''',
r'''app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query('DELETE FROM support_tickets WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({error: String(e)}); }
});''', text)

with open('server.ts', 'w') as f:
    f.write(text)

