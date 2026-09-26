import { useState, useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantCls: Record<ButtonVariant, string> = {
  primary: 'bg-[#FBBF24] text-[#0F172A] border border-[#FBBF24] hover:bg-[#F59E0B] active:bg-[#D97706] hover:shadow-[0_0_16px_rgba(251,191,36,0.2)]',
  secondary: 'bg-[#1E293B] text-[#F1F5F9] border border-[#334155] hover:bg-[#334155] active:bg-[#475569] hover:border-[#475569]',
  ghost: 'bg-transparent text-[#94A3B8] border-none hover:bg-[#1E293B] active:bg-[#334155] hover:text-[#F1F5F9]',
  destructive: 'bg-[#F87171] text-[#0F172A] border border-[#F87171] hover:bg-[#EF4444] active:bg-[#DC2626] hover:shadow-[0_0_16px_rgba(248,113,113,0.2)]',
};

const sizeCls: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[52px] px-7 py-3.5 text-base',
};

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={`btn-devlog ${variantCls[variant]} ${sizeCls[size]} ${className}`}
    />
  );
}

export function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-devlog min-h-[44px] bg-[#1E293B] text-[#F1F5F9] border border-[#334155] hover:bg-[#334155] active:bg-[#475569] hover:border-[#475569] ${className}`}
    />
  );
}

export function DangerButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-devlog min-h-[44px] bg-[#F87171] text-[#0F172A] border border-[#F87171] hover:bg-[#EF4444] active:bg-[#DC2626] ${className}`}
    />
  );
}

export function Field({
  label,
  children,
  hint,
  className = '',
}: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#64748B]">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-[44px] rounded-[8px] border border-[#334155] bg-[#0F172A] px-3.5 text-[16px] text-[#F1F5F9] placeholder-[#64748B] outline-none focus:border-[#FBBF24] focus:shadow-[0_0_12px_rgba(251,191,36,0.15)] ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-[8px] border border-[#334155] bg-[#0F172A] px-3.5 py-3 text-[16px] text-[#F1F5F9] placeholder-[#64748B] outline-none focus:border-[#FBBF24] focus:shadow-[0_0_12px_rgba(251,191,36,0.15)] ${props.className ?? ''}`}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full min-h-[44px] cursor-pointer appearance-none rounded-[8px] border border-[#334155] bg-[#0F172A] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:20px_20px] bg-[right_0.75rem_center] bg-no-repeat px-3.5 py-2.5 pr-11 text-[16px] text-[#F1F5F9] outline-none transition hover:border-[#475569] focus:border-[#FBBF24] focus:shadow-[0_0_12px_rgba(251,191,36,0.15)] ${props.className ?? ''}`}
    />
  );
}

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  group?: string;
}

/** Searchable dropdown — menggantikan native <select> yang styling-nya tidak konsisten. */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = '— Pilih —',
  emptyLabel = 'Tidak ada pilihan',
  searchPlaceholder = 'Cari...',
  allowEmpty = true,
  emptyValue = '',
  emptyText = '— Tidak ada —',
  disabled = false,
  id,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyValue?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)));
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, options, value]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => `${o.label} ${o.sublabel ?? ''} ${o.badge ?? ''} ${o.group ?? ''}`.toLowerCase().includes(q))
    : options;

  const groups: Array<{ name: string; items: ComboboxOption[] }> = [];
  for (const o of filtered) {
    const name = o.group ?? '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(o);
    else groups.push({ name, items: [o] });
  }
  const flat = filtered;

  const selected = options.find((o) => o.value === value);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = flat[activeIdx];
      if (o) commit(o.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  return (
    <div ref={rootRef} className="relative" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-[8px] border bg-[#0F172A] px-3.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
          open ? 'border-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.15)]' : 'border-[#334155] hover:border-[#475569]'
        }`}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className="flex min-w-0 items-baseline gap-2">
              {selected.badge && <span className="shrink-0 font-mono text-xs font-semibold text-[#FBBF24]">{selected.badge}</span>}
              <span className="truncate text-sm text-[#F1F5F9]">{selected.label}</span>
            </span>
          ) : (
            <span className="text-sm text-[#64748B]">{placeholder}</span>
          )}
        </span>
        <svg className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[280px] overflow-hidden rounded-[10px] border border-[#475569] bg-[#1E293B] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
          {options.length > 6 && (
            <div className="border-b border-[#334155] p-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="min-h-[40px] w-full rounded-[6px] border border-[#334155] bg-[#0F172A] px-3 text-sm text-[#F1F5F9] placeholder-[#64748B] outline-none focus:border-[#FBBF24]"
              />
            </div>
          )}

          <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto p-1.5" tabIndex={-1}>
            {flat.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[#64748B]">{emptyLabel}</li>
            )}

            {groups.map((g) => (
              <li key={g.name || '_'} className="mb-1 last:mb-0">
                {g.name && (
                  <p className="px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    {g.name}
                  </p>
                )}
                <ul>
                  {g.items.map((o) => {
                    const idx = flat.indexOf(o);
                    const active = idx === activeIdx;
                    const isSelected = o.value === value;
                    return (
                      <li key={o.value}>
                        <button
                          type="button"
                          data-active={active}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => commit(o.value)}
                          role="option"
                          aria-selected={isSelected}
                          className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition ${
                            active ? 'bg-[#0F172A] ring-1 ring-inset ring-[#FBBF24]/40' : ''
                          }`}
                        >
                          {o.badge && <span className="shrink-0 font-mono text-xs font-semibold text-[#FBBF24]">{o.badge}</span>}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-[#F1F5F9]">{o.label}</span>
                            {o.sublabel && <span className="block truncate font-mono text-xs text-[#64748B]">{o.sublabel}</span>}
                          </span>
                          {isSelected && <span className="shrink-0 text-sm text-[#FBBF24]">✓</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>

          {allowEmpty && (
            <div className="border-t border-[#334155] p-1.5">
              <button
                type="button"
                onClick={() => commit(emptyValue)}
                className={`min-h-[40px] w-full rounded-[6px] px-2.5 py-2 text-left text-sm transition hover:bg-[#0F172A] ${
                  value === emptyValue ? 'text-[#FBBF24]' : 'text-[#94A3B8]'
                }`}
              >
                {emptyText}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`surface-card p-4 sm:p-6 ${className}`}>{children}</div>;
}

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-[9999px] bg-[#1E293B] border border-[#334155] px-2.5 py-0.5 text-xs font-medium text-[#94A3B8] ${className}`}>
      {children}
    </span>
  );
}

export function Loading({ text = 'Memuat...' }: { text?: string }) {
  return (
    <div className="py-10 text-center" role="status" aria-live="polite">
      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#334155] border-t-[#FBBF24]"></div>
      <p className="mt-2 text-sm text-[#94A3B8]">{text}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[8px] bg-[#334155]/60 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>
    </Card>
  );
}

export function ProgressBar({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-[#0F172A] ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[#FBBF24] transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ value, label, accent = 'text-[#F1F5F9]' }: { value: React.ReactNode; label: string; accent?: string }) {
  return (
    <Card className="text-center !p-3 sm:!p-4">
      <p className={`text-2xl sm:text-3xl font-bold font-display ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[11px] sm:text-caption text-[#64748B] leading-tight">{label}</p>
    </Card>
  );
}

export function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-subhead font-semibold text-[#F1F5F9]">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-[#94A3B8]">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ options, value, onChange, label }: { options: Array<{ key: T; label: string }>; value: T; onChange: (k: T) => void; label: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`min-h-[40px] shrink-0 rounded-[8px] border px-4 py-2 text-sm font-medium transition ${
            value === o.key
              ? 'border-[#FBBF24] bg-[#FBBF24]/10 text-[#FBBF24]'
              : 'border-[#334155] bg-[#1E293B] text-[#94A3B8] hover:border-[#475569] hover:text-[#F1F5F9]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[#334155] bg-[#1E293B] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[#F1F5F9]">{title}</p>
      {desc && <p className="mx-auto mt-1 max-w-sm text-sm text-[#64748B]">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[8px] border border-[#F87171]/25 bg-[#F87171]/10 px-6 py-5 text-center">
      <p className="text-sm text-[#F87171]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 min-h-[44px] px-4 text-sm font-medium text-[#F87171] underline">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Hapus',
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-[12px] bg-[#1E293B] border border-[#334155] p-5 shadow-[0_0_32px_rgba(0,0,0,0.5)] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <h3 className="text-base font-semibold text-[#F1F5F9]">{title}</h3>
        <p className="mt-1 text-sm text-[#94A3B8]">{message}</p>
        <div className="mt-4 flex gap-2">
          <SecondaryButton onClick={onCancel} className="flex-1" disabled={busy}>
            Batal
          </SecondaryButton>
          <DangerButton onClick={onConfirm} className="flex-1" disabled={busy}>
            {busy ? 'Memproses...' : confirmLabel}
          </DangerButton>
        </div>
      </div>
    </div>
  );
}
