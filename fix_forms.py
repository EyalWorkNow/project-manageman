import os
import glob

files = [
    'src/pages/ProjectForm.tsx',
    'src/pages/TaskForm.tsx',
    'src/pages/Submission.tsx'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        # Replaces
        content = content.replace("bg-[#F6F7FB]", "bg-[#FAFAFA]")
        content = content.replace("text-[#1F2D3D]", "text-zinc-900")
        content = content.replace("text-[#6B7A8D]", "text-zinc-500")
        content = content.replace("text-[#E2445C]", "text-red-500")
        content = content.replace("border-l-[#E2445C]", "border-l-red-500")
        content = content.replace("border-r-[#E2445C]", "border-r-red-500")
        content = content.replace("bg-slate-50", "bg-zinc-50")
        content = content.replace("border-slate-100", "border-zinc-100")
        content = content.replace("text-slate-500", "text-zinc-500")
        content = content.replace("text-slate-900", "text-zinc-900")
        content = content.replace("text-slate-400", "text-zinc-400")

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"File not found: {filepath}")

