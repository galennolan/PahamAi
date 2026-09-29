import { useState, useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantCls: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-[rgb(var(--on-primary))] border border-primary hover:bg-primary-hover active:bg-primary-active hover:shadow-[0_0_16px_rgb(var(--primary)/0.2)]',
  secondary: 'bg-surface text-fg border border-border-2 hover:bg-surface-2 active:bg-border-3 hover:border-border-3',
  ghost: 'bg-transparent text-fg-muted border-none hover:bg-surface active:bg-surface-2 hover:text-fg',
  destructive: 'bg-destructive text-white border border-destructive hover:bg-destructive-hover active:bg-destructive-active hover:shadow-[0_0_16px_rgb(var(--destructive)/0.2)]',
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
      className={`btn-devlog min-h-[44px] bg-surface text-fg border border-border-2 hover:bg-surface-2 active:bg-border-3 hover:border-border-3 ${className}`}
    />
  );
}

export function DangerButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-devlog min-h-[44px] bg-destructive text-white border border-destructive hover:bg-destructive-hover active:bg-destructive-active ${className}`}
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
      <span className="mb-1.5 block text-xs font-semibold text-fg-muted uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fg-subtle">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-[44px] rounded-lg border border-border-2 bg-bg px-3.5 text-[16px] text-fg placeholder-fg-subtle outline-none focus:border-primary focus:shadow-[0_0_12px_rgb(var(--primary)/0.15)] ${props.className ?? ''}`}
    />
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`w-full min-h-[44px] rounded-lg border border-border-2 bg-bg px-3.5 text-[16px] text-fg placeholder-fg-subtle outline-none focus:border-primary focus:shadow-[0_0_12px_rgb(var(--primary)/0.15)] pr-12 ${props.className ?? ''}`}
      />
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setShow(s => !s); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition"
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-border-2 bg-bg px-3.5 py-3 text-[16px] text-fg placeholder-fg-subtle outline-none focus:border-primary focus:shadow-[0_0_12px_rgb(var(--primary)/0.15)] ${props.className ?? ''}`}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full min-h-[44px] cursor-pointer appearance-none rounded-lg border border-border-2 bg-bg bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:20px_20px] bg-[right_0.75rem_center] bg-no-repeat px-3.5 py-2.5 pr-11 text-[16px] text-fg outline-none transition hover:border-border-3 focus:border-primary focus:shadow-[0_0_12px_rgb(var(--primary)/0.15)] ${props.className ?? ''}`}
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
      if (flat[activeIdx]) commit(flat[activeIdx].value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  return (
    <div ref={rootRef} className="relative" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-border-2 bg-bg px-3.5 py-2.5 text-left text-[16px] outline-none transition hover:border-border-3 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'text-fg' : 'text-fg-subtle'}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.label}</span>
              {selected.sublabel && <span className="ml-2 text-xs text-fg-subtle">{selected.sublabel}</span>}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg className={`h-5 w-5 shrink-0 text-fg-muted transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border-2 bg-surface shadow-xl">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-md bg-bg px-3 py-2 text-sm text-fg placeholder-fg-subtle outline-none"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {allowEmpty && !q && (
              <li>
                <button
                  type="button"
                  data-idx={-1}
                  onClick={() => commit(emptyValue)}
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-2"
                >
                  {emptyText}
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-fg-subtle">{emptyLabel}</li>
            )}
            {groups.map((g) => (
              <li key={g.name || 'all'}>
                {g.name && <p className="px-3 pb-1 pt-2 text-overline font-semibold uppercase text-fg-subtle">{g.name}</p>}
                {g.items.map((o) => {
                  const idx = flat.indexOf(o);
                  const active = idx === activeIdx;
                  const isSel = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      data-idx={idx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => commit(o.value)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${active ? 'bg-surface-2 text-fg' : 'text-fg'} ${isSel ? 'font-semibold' : ''}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{o.label}</span>
                        {o.sublabel && <span className="block truncate text-xs text-fg-subtle">{o.sublabel}</span>}
                      </span>
                      {o.badge && (
                        <span className="shrink-0 rounded-full border border-border-2 px-2 py-0.5 font-mono text-[11px] text-primary-text">
                          {o.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </li>
            ))}
          </ul>
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
    <span className={`inline-flex items-center rounded-full bg-surface border border-border-2 px-2.5 py-0.5 text-xs font-medium text-fg-muted ${className}`}>
      {children}
    </span>
  );
}

export function Loading({ text = 'Memuat...' }: { text?: string }) {
  return (
    <div className="py-10 text-center" role="status" aria-live="polite">
      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border-2 border-t-primary"></div>
      <p className="mt-2 text-sm text-fg-muted">{text}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface-2/60 ${className}`} />;
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
    <div className={`h-2 overflow-hidden rounded-full bg-bg ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ value, label, accent = 'text-fg' }: { value: React.ReactNode; label: string; accent?: string }) {
  return (
    <Card className="text-center !p-3 sm:!p-4">
      <p className={`text-2xl sm:text-3xl font-bold font-display ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[11px] sm:text-caption text-fg-subtle leading-tight">{label}</p>
    </Card>
  );
}

export function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-subhead font-semibold text-fg">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-fg-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ options, value, onChange, label }: { options: Array<{ key: T; label: string }>; value: T; onChange: (k: T) => void | ((prev: T) => T); label: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`min-h-[40px] shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition ${
            value === o.key
              ? 'border-primary bg-primary/10 text-primary-text'
              : 'border-border-2 bg-surface text-fg-muted hover:border-border-3 hover:text-fg'
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
    <div className="rounded-lg border border-dashed border-border-2 bg-surface px-6 py-10 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {desc && <p className="mx-auto mt-1 max-w-sm text-sm text-fg-subtle">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-6 py-5 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 min-h-[44px] px-4 text-sm font-medium text-destructive underline">
          Coba lagi
        </button>
      )}
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
      <div className="w-full max-w-sm rounded-xl bg-surface border border-border-2 p-5 shadow-[0_0_32px_rgba(0,0,0,0.5)] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm text-fg-muted">{message}</p>
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

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-2">
      <table className={`w-full text-sm ${className}`}>{children}</table>
    </div>
  );
}
