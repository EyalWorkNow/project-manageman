import os

files = [
    'src/pages/ProjectDetails.tsx',
    'src/pages/CustomerView.tsx'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        # Replaces
        content = content.replace("bg-[#F6F7FB]", "bg-[#FAFAFA]")
        content = content.replace("bg-[#F8FAFC]", "bg-[#FAFAFA]")
        content = content.replace("text-[#1F2D3D]", "text-zinc-900")
        content = content.replace("text-[#6B7A8D]", "text-zinc-500")
        content = content.replace("text-slate-500", "text-zinc-500")
        content = content.replace("text-slate-900", "text-zinc-900")
        content = content.replace("text-slate-400", "text-zinc-400")
        content = content.replace("border-slate-100", "border-zinc-200/50")
        content = content.replace("bg-slate-900", "bg-zinc-950")
        content = content.replace("bg-slate-950", "bg-black")
        content = content.replace("bg-blue-500/10", "bg-zinc-800/40")
        content = content.replace("text-blue-400", "text-zinc-300")
        content = content.replace("bg-slate-50", "bg-zinc-50")
        content = content.replace("text-[#0073EA]", "text-zinc-900")
        content = content.replace("border-[#0073EA]", "border-zinc-900")
        content = content.replace("bg-[#E8F3FF]", "bg-zinc-100")
        content = content.replace("text-[#D4D9E3]", "text-zinc-300")
        content = content.replace("bg-[#D4D9E3]", "bg-zinc-200")
        content = content.replace("bg-[#F0F2F7]", "bg-zinc-100")
        content = content.replace("bg-[#E6E9EF]", "bg-zinc-200/50")
        content = content.replace("border-[#E6E9EF]", "border-zinc-200/50")

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

