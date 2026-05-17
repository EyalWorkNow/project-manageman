import os

def replace_in_file(filepath, old, new):
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        content = content.replace(old, new)
        with open(filepath, 'w') as f:
            f.write(content)

# Fix button rounding overrides
for f in ['src/pages/ProjectForm.tsx', 'src/pages/TaskForm.tsx']:
    replace_in_file(f, 'btn-secondary w-9 h-9 rounded-lg', 'btn-secondary w-10 h-10 p-0 rounded-2xl') # Fix to match new aesthetic
    replace_in_file(f, 'btn-primary w-full py-3 rounded-lg', 'btn-primary w-full py-3 rounded-2xl')

sub_file = 'src/pages/Submission.tsx'
if os.path.exists(sub_file):
    with open(sub_file, 'r') as f:
        sub = f.read()
    
    # Modernize Submission.tsx
    sub = sub.replace("bg-blue-50 border border-blue-100 text-blue-700", "bg-zinc-100 border border-zinc-200/50 text-zinc-800")
    sub = sub.replace("text-blue-600", "text-zinc-900")
    sub = sub.replace("bg-slate-900", "bg-zinc-950")
    sub = sub.replace("bg-blue-500/10", "bg-zinc-800/40")
    sub = sub.replace("text-blue-400", "text-zinc-300")
    sub = sub.replace("text-blue-200", "text-zinc-400")
    sub = sub.replace("hover:border-blue-500/20", "hover:border-white/20")
    sub = sub.replace("text-slate-600", "text-zinc-500")
    sub = sub.replace("bg-blue-500", "bg-zinc-900")
    sub = sub.replace("text-blue-700", "text-zinc-900")
    sub = sub.replace("text-blue-500", "text-zinc-500")
    sub = sub.replace("hover:bg-blue-600", "hover:bg-zinc-800")
    sub = sub.replace("shadow-2xl", "shadow-xl")
    sub = sub.replace("bg-slate-900", "bg-zinc-950")
    
    with open(sub_file, 'w') as f:
        f.write(sub)
    print("Updated Submission.tsx")

