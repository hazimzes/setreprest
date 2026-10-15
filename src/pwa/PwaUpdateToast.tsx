import { useEffect, useState } from 'react';
import { setupUpdatePrompt } from './registerSW';

/** Offers a reload when a new service worker version is waiting. */
export function PwaUpdateToast() {
  const [reload, setReload] = useState<(() => void) | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    try {
      dispose = setupUpdatePrompt((reloadFn) => {
        setReload(() => reloadFn);
        return () => setReload(null);
      });
    } catch {
      // registerSW is unavailable in some test environments — updates simply don't prompt.
    }
    return () => dispose?.();
  }, []);

  if (!reload) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-3 z-[70] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-[8px] border border-line bg-surface px-4 py-3 text-sm shadow-lg"
    >
      <span>A new version is available.</span>
      <button className="font-semibold text-accent" onClick={() => reload()}>
        Reload
      </button>
    </div>
  );
}
