import re

with open('server.ts', 'r') as f:
    text = f.read()

text = text.replace('app.get("/api/system/stats", (_req, res) => {', 'app.get("/api/system/stats", async (_req, res) => {')
text = text.replace('app.get("/api/projects/:id/members", (req, res) => {', 'app.get("/api/projects/:id/members", async (req, res) => {')

# The ([]) push and indexing:
text = re.sub(r'\(\[\]\)\.push\(.*?\);', '', text)
text = re.sub(r'\(\[\]\)\[.*?\] = .*?;', '', text)
text = re.sub(r'\(\[\]\)\.splice\(.*?\);', '', text)
text = text.replace('res.json(([])[index]);', 'res.json({});')

with open('server.ts', 'w') as f:
    f.write(text)
