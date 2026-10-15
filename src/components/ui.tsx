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

/* ------------------------------- Icons ------------------------------- */

export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------ Button ------------------------------- */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export function Button({
  variant = 'outline',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-accent-ink font-semibold hover:brightness-110 active:brightness-95',
    outline: 'border border-line-strong bg-surface text-fg hover:bg-raised',
    ghost: 'text-secondary hover:bg-raised hover:text-fg',
    danger: 'border border-danger/35 text-danger hover:bg-danger/10',
  };
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}

/* ---------------------------- Micro label ---------------------------- */

export function MicroLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`microlabel ${className}`}>{children}</p>;
}

/* ------------------------------- Chip -------------------------------- */

export function Chip({
  active,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={`h-7 shrink-0 rounded-[6px] border px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent ${
        active
          ? 'border-line-strong bg-hover text-fg'
          : 'border-line bg-surface text-secondary hover:text-fg'
      } ${className}`}
      {...rest}
    />
  );
}

/* ------------------------------- Sheet ------------------------------- */

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
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-[10px] border border-line bg-surface focus:outline-none sm:max-w-sm sm:rounded-[10px]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 rounded-[6px] p-1 text-muted hover:bg-raised hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Confirm sheet --------------------------- */

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
      <p className="text-[13px] leading-relaxed text-secondary">{message}</p>
      {children}
      {requireText !== undefined && (
        <input
          className="mt-3 w-full rounded-[8px] border border-line bg-raised px-2.5 py-2 text-sm text-fg outline-none focus:border-line-strong"
          placeholder={`Type "${requireText}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label={`Type ${requireText} to confirm`}
        />
      )}
    </Sheet>
  );
}

/* ---------------------------- Empty state ---------------------------- */

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
    <div className="py-10 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[6px] bg-raised ${className}`} aria-hidden="true" />;
}

/* ---------------------------- NumberField ---------------------------- */

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
    <div className={`flex h-9 items-center rounded-[8px] border border-line bg-raised ${className}`}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className="h-full w-8 shrink-0 rounded-l-[8px] text-secondary transition-colors hover:bg-hover hover:text-fg disabled:opacity-40"
        disabled={value <= min}
        onClick={() => onChange(round(clamp(value - step)))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        className="tnum h-full w-full min-w-0 border-x border-line bg-transparent px-1 text-center text-sm text-fg outline-none"
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : min);
        }}
        {...rest}
      />
      {suffix && (
        <span className="shrink-0 pr-1.5 text-[10px] text-muted" aria-hidden="true">
          {suffix}
        </span>
      )}
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className="h-full w-8 shrink-0 rounded-r-[8px] text-secondary transition-colors hover:bg-hover hover:text-fg disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(round(clamp(value + step)))}
      >
        +
      </button>
    </div>
  );
}

/* --------------------------- SegmentedControl ------------------------ */

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
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-[8px] border border-line bg-raised p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-8 flex-1 rounded-[6px] px-3 text-[13px] font-medium transition-colors duration-150 ${
            value === opt.value ? 'bg-surface text-fg shadow-[0_0_0_1px_var(--app-line-strong)]' : 'text-secondary hover:text-fg'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Toast -------------------------------- */

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
            className={`pointer-events-auto max-w-sm rounded-[8px] border bg-surface px-3.5 py-2 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${
              toast.kind === 'error'
                ? 'border-danger/40 text-danger'
                : 'border-line-strong text-fg'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
