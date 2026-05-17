with open('server.ts', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "const { status } = req.body as { status?: string };" in line and not skip:
        skip = True
    
    if skip:
        if line.strip() == "});":
            skip = False # Done skipping
        continue
    
    out.append(line)

with open('server.ts', 'w') as f:
    f.writelines(out)

