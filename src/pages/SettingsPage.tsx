import { useRef, useState } from 'react';
import { useAppStore } from '../state/appStore';
import { Button, ConfirmSheet, Segmented, useToast } from '../components/ui';

export function SettingsPage() {
  const store = useAppStore();
  const { settings, storageAvailable, sessions, exercises } = store.state;
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ text: string; name: string } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [resetOpen, setResetOpen] = useState(false);

  const onImportFile = async (file: File) => {
    const text = await file.text();
    // Pre-validate before showing mode choice, so failures surface immediately.
    try {
      const parsed: unknown = JSON.parse(text);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        (parsed as Record<string, unknown>).app !== 'setreprest'
      ) {
        throw new Error('not a backup');
      }
      setPendingImport({ text, name: file.name });
      setImportMode('merge');
    } catch {
      toast('This file is not a valid SetRepRest backup.', 'error');
    }
  };

  const runImport = async () => {
    if (!pendingImport) return;
    try {
      const result = await store.importBackupFromText(pendingImport.text, importMode);
      toast(
        `Restored ${result.sessions} workouts, ${result.exercises} exercises, ${result.templates} templates.`,
        'success'
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed.', 'error');
    } finally {
      setPendingImport(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Preferences</h2>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Units</p>
          <Segmented
            ariaLabel="Weight units"
            value={settings.units}
            onChange={(v) => void store.setUnits(v)}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
          <p className="mt-2 text-xs text-muted">
            Changes display only. Logged weights keep the unit they were captured in.
          </p>

          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted">Theme</p>
          <Segmented
            ariaLabel="Theme"
            value={settings.theme}
            onChange={(v) => void store.setTheme(v)}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />

          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted">
            Rest timer
          </p>
          <label className="flex items-center justify-between text-sm">
            Auto-start after completing a set
            <input
              type="checkbox"
              checked={settings.restTimerEnabled}
              onChange={(e) => void store.setRestTimerEnabled(e.target.checked)}
              className="h-5 w-5 accent-[var(--app-accent)]"
            />
          </label>
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-muted">Default rest (seconds)</p>
            <div className="flex gap-1.5">
              {[60, 90, 120, 180].map((sec) => (
                <Button
                  key={sec}
                  variant={settings.defaultRestSec === sec ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => void store.setDefaultRestSec(sec)}
                >
                  {sec}s
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Your data</h2>
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">
            {sessions.length} workouts · {exercises.length} exercises stored on this device.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() =>
                void store.exportBackupFile().catch((e: Error) => toast(e.message, 'error'))
              }
              disabled={!storageAvailable}
            >
              Export backup (JSON)
            </Button>
            <Button
              onClick={() =>
                void store.exportHistoryCsv().catch((e: Error) => toast(e.message, 'error'))
              }
            >
              Export history (CSV)
            </Button>
            <Button
              onClick={() =>
                void store.exportSummaryCsv().catch((e: Error) => toast(e.message, 'error'))
              }
            >
              Export summary (CSV)
            </Button>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!storageAvailable}
            >
              Restore backup
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Choose backup file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="danger" className="w-full" disabled={!storageAvailable} onClick={() => setResetOpen(true)}>
            Reset all data…
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Where is my data?</h2>
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
          <p>
            SetRepRest stores everything locally in your browser (IndexedDB). Nothing is uploaded —
            there is no account and no server.
          </p>
          <p>
            That also means: clearing this site's browser data, uninstalling the browser, or losing
            the device deletes your training history. Browsers may also evict site data when storage
            runs low.
          </p>
          <p>
            <strong className="text-fg">Recommendation:</strong> export a JSON backup regularly —
            for example once a month — and keep it somewhere safe. The backup restores everything
            (workouts, exercises, templates, settings) on this or any other device.
          </p>
          {!storageAvailable && (
            <p className="text-danger">
              Storage is currently unavailable (common in private browsing). The app is read-only
              until you reopen it in a normal window.
            </p>
          )}
        </div>
      </section>

      <p className="pb-4 text-center text-[11px] text-muted">SetRepRest · local-first workout tracker</p>

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all data?"
        message="Every workout, custom exercise, template, and preference on this device will be permanently deleted. This cannot be undone — export a backup first if in doubt."
        confirmLabel="Delete everything"
        danger
        requireText="DELETE"
        onConfirm={() => {
          void store
            .resetAllData()
            .then(() => toast('All data deleted', 'success'))
            .catch((e: Error) => toast(e.message, 'error'));
        }}
      />

      <ConfirmSheet
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Restore backup"
        confirmLabel={importMode === 'replace' ? 'Replace all data' : 'Merge into existing'}
        message={
          pendingImport
            ? `"${pendingImport.name}" validated OK. ${
                importMode === 'replace'
                  ? 'Replace wipes ALL current data and restores the backup exactly.'
                  : 'Merge keeps current data and adds anything missing from the backup.'
              }`
            : ''
        }
        onConfirm={() => void runImport()}
      >
        {pendingImport && (
          <div className="mt-1">
            <Segmented
              ariaLabel="Import mode"
              value={importMode}
              onChange={setImportMode}
              options={[
                { value: 'merge', label: 'Merge' },
                { value: 'replace', label: 'Replace' },
              ]}
            />
          </div>
        )}
      </ConfirmSheet>
    </div>
  );
}
