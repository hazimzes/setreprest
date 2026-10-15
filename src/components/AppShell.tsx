import { Component, type ErrorInfo, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../state/appStore';

const TABS = [
  { to: '/', label: 'Home', icon: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z' },
  { to: '/progress', label: 'Progress', icon: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
  { to: '/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/library', label: 'Library', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/templates', label: 'Templates', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted">
            An unexpected error occurred. Your saved data is safe — reload to continue.
          </p>
          <button
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StorageBanner() {
  const storageAvailable = useAppStore().state.storageAvailable;
  if (storageAvailable) return null;
  return (
    <div role="alert" className="border-b border-danger/30 bg-danger/10 px-4 py-2.5 text-center text-xs text-danger">
      Storage is unavailable — the app is read-only. Private browsing or full storage can cause this.
      Your existing data is untouched.
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="flex min-h-dvh flex-col bg-bg text-fg">
        <StorageBanner />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-5 sm:pb-10 md:pt-16">{children}</main>
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:inset-x-auto md:bottom-auto md:left-1/2 md:right-auto md:top-0 md:w-full md:max-w-xl md:-translate-x-1/2 md:border-x-0 md:border-t-0 md:bg-bg md:px-4"
        >
          <div className="mx-auto flex max-w-xl items-stretch justify-around md:justify-end md:gap-0.5 md:py-1.5">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-2 text-[10px] font-medium md:min-h-8 md:flex-none md:flex-row md:gap-1.5 md:rounded-[6px] md:px-2.5 md:text-[13px] ${
                    isActive ? 'text-fg' : 'text-muted hover:text-secondary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="md:hidden">
                      <path d={tab.icon} stroke="currentColor" strokeWidth={isActive ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {tab.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent transition-opacity duration-150 md:hidden ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </ErrorBoundary>
  );
}
