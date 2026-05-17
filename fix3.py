import re
with open('server.ts', 'r') as f: text = f.read()
text = re.sub(r'db\.comments', '([])', text)
text = re.sub(r'db\.projectMembers', '([])', text)
text = re.sub(r'await loadDatabase\(\);', '// await loadDatabase();', text)
with open('server.ts', 'w') as f: f.write(text)
