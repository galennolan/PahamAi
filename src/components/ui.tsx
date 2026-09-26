import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantCls: Record<ButtonVariant, string> = {
  primary: 'bg-[#4ADE80] text-[#0F172A] border border-[#4ADE80] hover:bg-[#22C55E] hover:shadow-[0_0_16px_rgba(74,222,128,0.2)]',
  secondary: 'bg-[#1E293B] text-[#F1F5F9] border border-[#334155] hover:bg-[#334155] hover:border-[#475569]',
  ghost: 'bg-transparent text-[#94A3B8] border-none hover:bg-[#1E293B] hover:text-[#F1F5F9]',
  destructive: 'bg-[#F87171] text-[#0F172A] border border-[#F87171] hover:bg-[#EF4444] hover:shadow-[0_0_16px_rgba(248,113,113,0.2)]',
};

const sizeCls: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-5 py-2 text-sm',
  lg: 'px-7 py-3 text-base',
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
      className={`btn-devlog bg-[#1E293B] text-[#F1F5F9] border border-[#334155] hover:bg-[#334155] hover:border-[#475569] ${className}`}
    />
  );
}

export function DangerButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-devlog bg-[#F87171] text-[#0F172A] border border-[#F87171] hover:bg-[#EF4444] ${className}`}
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
      <span className="mb-1 block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#64748B]">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-10 rounded-[4px] border border-[#334155] bg-[#0F172A] px-3.5 text-sm text-[#F1F5F9] placeholder-[#64748B] outline-none focus:border-[#4ADE80] focus:shadow-[0_0_12px_rgba(74,222,128,0.15)] ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-[4px] border border-[#334155] bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#F1F5F9] placeholder-[#64748B] outline-none focus:border-[#4ADE80] focus:shadow-[0_0_12px_rgba(74,222,128,0.15)] ${props.className ?? ''}`}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-[4px] border border-[#334155] bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#F1F5F9] outline-none focus:border-[#4ADE80] focus:shadow-[0_0_12px_rgba(74,222,128,0.15)] ${props.className ?? ''}`}
    />
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`surface-card p-6 ${className}`}>{children}</div>;
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
    <div className="py-10 text-center">
      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#334155] border-t-[#4ADE80]"></div>
      <p className="mt-2 text-sm text-[#94A3B8]">{text}</p>
    </div>
  );
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="rounded-[4px] border border-dashed border-[#334155] bg-[#1E293B] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[#F1F5F9]">{title}</p>
      {desc && <p className="mt-1 text-sm text-[#64748B]">{desc}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[4px] border border-[#F87171]/25 bg-[#F87171]/10 px-6 py-5 text-center">
      <p className="text-sm text-[#F87171]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-medium text-[#F87171] underline">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-[6px] bg-[#1E293B] border border-[#334155] p-5 shadow-[0_0_32px_rgba(0,0,0,0.5)]">
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
