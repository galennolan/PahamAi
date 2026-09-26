import re, os

ROOT = r"C:\Users\Galih Setiawan\Downloads\KURSUS\paham-ai-app\src"
REPLACEMENTS = [
    (r'bg-\[#0F172A\]', 'bg-bg'),
    (r'bg-\[#1E293B\]', 'bg-surface'),
    (r'bg-\[#334155\]', 'bg-surface-2'),
    (r'bg-\[#475569\]', 'bg-border-3'),
    (r'text-\[#F1F5F9\]', 'text-fg'),
    (r'text-\[#94A3B8\]', 'text-fg-muted'),
    (r'text-\[#64748B\]', 'text-fg-subtle'),
    (r'border-\[#1E293B\]', 'border-border'),
    (r'border-\[#334155\]', 'border-border-2'),
    (r'border-\[#475569\]', 'border-border-3'),
    (r'border-\[#FBBF24\]', 'border-primary'),
    (r'text-\[#FBBF24\]', 'text-primary-text'),
    (r'bg-\[#FBBF24\]', 'bg-primary'),
    (r'bg-\[#F59E0B\]', 'bg-primary-hover'),
    (r'bg-\[#D97706\]', 'bg-primary-active'),
    (r'hover:bg-\[#F59E0B\]', 'hover:bg-primary-hover'),
    (r'active:bg-\[#D97706\]', 'active:bg-primary-active'),
    (r'bg-\[#22D3EE\]', 'bg-accent'),
    (r'text-\[#22D3EE\]', 'text-accent'),
    (r'bg-\[#4ADE80\]', 'bg-success'),
    (r'text-\[#4ADE80\]', 'text-success'),
    (r'bg-\[#F87171\]', 'bg-destructive'),
    (r'text-\[#F87171\]', 'text-destructive'),
    (r'bg-\[#EF4444\]', 'bg-destructive-hover'),
    (r'bg-\[#DC2626\]', 'bg-destructive-active'),
    (r'#0F172A', 'bg'),
    (r'#1E293B', 'surface'),
    (r'#334155', 'surface-2'),
    (r'#475569', 'border-3'),
    (r'#F1F5F9', 'fg'),
    (r'#94A3B8', 'fg-muted'),
    (r'#64748B', 'fg-subtle'),
    (r'#FBBF24', 'primary'),
    (r'#F59E0B', 'primary-hover'),
    (r'#D97706', 'primary-active'),
    (r'#22D3EE', 'accent'),
    (r'#4ADE80', 'success'),
    (r'#F87171', 'destructive'),
    (r'#EF4444', 'destructive-hover'),
    (r'#DC2626', 'destructive-active'),
]

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for pattern, repl in REPLACEMENTS:
        content = re.sub(pattern, repl, content)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

changed = 0
for root, _, files in os.walk(r"C:\Users\Galih Setiawan\Downloads\KURSUS\paham-ai-app\src"):
    for fn in files:
        if fn.endswith('.tsx') or fn.endswith('.ts'):
            p = os.path.join(root, fn)
            if process_file(p):
                changed += 1
print(f"Changed {changed} files")