import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { createId } from '../domain/id';

/* ------------------------------ Button ------------------------------ */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export function Button({
  variant = 'outline',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      'bg-accent text-accent-ink font-semibold hover:brightness-110 active:brightness-95',
    outline: 'border border-line bg-surface hover:bg-raised',
    ghost: 'hover:bg-raised',
    danger: 'border border-danger/40 text-danger hover:bg-danger/10',
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}

/* ------------------------------- Chip ------------------------------- */

export function Chip({
  active,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        active
          ? 'border-accent bg-accent-soft text-fg'
          : 'border-line bg-surface text-muted hover:text-fg'
      } ${className}`}
      {...rest}
    />
  );
}

/* ------------------------------- Sheet ------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <button
        aria-label="Close overlay"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Confirm sheet -------------------------- */

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  requireText,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const blocked = requireText !== undefined && typed !== requireText;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            disabled={blocked}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">{message}</p>
      {children}
      {requireText !== undefined && (
        <input
          className="mt-3 w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm focus-visible:outline-accent"
          placeholder={`Type "${requireText}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label={`Type ${requireText} to confirm`}
        />
      )}
    </Sheet>
  );
}

/* ---------------------------- Empty state --------------------------- */

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-raised ${className}`} aria-hidden="true" />;
}

/* ---------------------------- NumberField --------------------------- */

export function NumberField({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  label,
  suffix,
  className = '',
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  suffix?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <div className={`flex items-center rounded-xl border border-line bg-raised ${className}`}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className="h-11 w-10 shrink-0 rounded-l-xl text-lg text-muted hover:text-fg disabled:opacity-40"
        disabled={value <= min}
        onClick={() => onChange(round(clamp(value - step)))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        className="tnum h-11 w-full min-w-0 border-x border-line bg-transparent px-1 text-center text-sm outline-none"
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : min);
        }}
        {...rest}
      />
      {suffix && (
        <span className="shrink-0 pr-1 text-xs text-muted" aria-hidden="true">
          {suffix}
        </span>
      )}
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className="h-11 w-10 shrink-0 rounded-r-xl text-lg text-muted hover:text-fg disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(round(clamp(value + step)))}
      >
        +
      </button>
    </div>
  );
}

/* --------------------------- SegmentedControl ----------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-xl border border-line bg-raised p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${
            value === opt.value ? 'bg-accent text-accent-ink' : 'text-muted hover:text-fg'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Toast ------------------------------- */

interface ToastState {
  id: string;
  message: string;
  kind: 'info' | 'error' | 'success';
}

const ToastContext = createContext<(message: string, kind?: ToastState['kind']) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((message: string, kind: ToastState['kind'] = 'info') => {
    setToast({ id: createId(), message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-sm rounded-xl border px-4 py-2.5 text-sm shadow-lg ${
              toast.kind === 'error'
                ? 'border-danger/40 bg-surface text-danger'
                : toast.kind === 'success'
                  ? 'border-accent/40 bg-surface text-fg'
                  : 'border-line bg-surface text-fg'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
