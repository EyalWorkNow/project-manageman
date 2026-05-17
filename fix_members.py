import sys

def main():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    old_get = """// GET project members
app.get("/api/projects/:id/members", async (req, res) => {
  const project = (await getProjects()).find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  res.json(([]).filter((m) => m.projectId === req.params.id));
});"""

    new_get = """// GET project members
app.get("/api/projects/:id/members", async (req, res) => {
  try {
    const project = (await getProjects()).find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const result = await pool.query('SELECT * FROM users WHERE organization_id = $1 ORDER BY name ASC', [req.params.id]);
    const members = result.rows.map(u => ({
      id: u.id,
      projectId: u.organization_id,
      name: u.name,
      email: u.email,
      title: u.title || "Team Member",
      createdAt: u.created_at.toISOString()
    }));
    res.json(members);
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});"""
    content = content.replace(old_get, new_get)

    old_post = """// POST add member
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
});"""

    new_post = """// POST add member
app.post("/api/projects/:id/members", async (req, res) => {
  try {
    const project = (await getProjects()).find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const name = readText(req.body?.name);
    const email = readText(req.body?.email);
    const title = readText(req.body?.title) || "Team Member";
    if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
    
    const newId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO users (id, organization_id, email, name, title, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [newId, req.params.id, email, name, title, 'active']
    );
    
    const member = { id: newId, projectId: req.params.id, name, email, title, createdAt: nowIso() };
    res.status(201).json(member);
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});"""
    content = content.replace(old_post, new_post)

    old_patch = """// PATCH update member title
app.patch("/api/projects/:id/members/:memberId", async (req, res) => {
  const index = ([]).findIndex((m) => m.id === req.params.memberId && m.projectId === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Member not found." });
  const title = readText(req.body?.title);
  if (!title) return res.status(400).json({ error: "Title is required." });
  
  // Postgres save happens instantly via queries
  res.json({});
});"""

    new_patch = """// PATCH update member title
app.patch("/api/projects/:id/members/:memberId", async (req, res) => {
  try {
    const title = readText(req.body?.title);
    if (!title) return res.status(400).json({ error: "Title is required." });
    
    await pool.query(
      'UPDATE users SET title = $1 WHERE id = $2 AND organization_id = $3',
      [title, req.params.memberId, req.params.id]
    );
    
    res.json({});
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});"""
    content = content.replace(old_patch, new_patch)

    old_del = """// DELETE member
app.delete("/api/projects/:id/members/:memberId", async (req, res) => {
  const index = ([]).findIndex((m) => m.id === req.params.memberId && m.projectId === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Member not found." });
  
  // Postgres save happens instantly via queries
  res.json({ ok: true });
});"""

    new_del = """// DELETE member
app.delete("/api/projects/:id/members/:memberId", async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM users WHERE id = $1 AND organization_id = $2',
      [req.params.memberId, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({error: String(e)});
  }
});"""
    content = content.replace(old_del, new_del)

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done rewriting members API")

if __name__ == '__main__':
    main()
