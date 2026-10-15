import { useRef, useState } from 'react';
import { useAppStore } from '../state/appStore';
import { Button, ConfirmSheet, Segmented, Sheet, useToast } from '../components/ui';

export function SettingsPage() {
  const store = useAppStore();
  const { settings, storageAvailable, sessions, exercises, gyms } = store.state;
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ text: string; name: string } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [resetOpen, setResetOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [gymEdit, setGymEdit] = useState<{ id: string; name: string } | null>(null);
  const [gymDelete, setGymDelete] = useState<{ id: string; name: string; usedBy: number } | null>(null);

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
        <h1 className="text-[15px] font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold tracking-tight">Preferences</h2>
        <div className="rounded-[10px] border border-line bg-surface p-4">
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
        <h2 className="text-[13px] font-semibold tracking-tight">Demo data</h2>
        <div className="space-y-2 rounded-[10px] border border-line bg-surface p-4">
          <p className="text-xs leading-relaxed text-muted">
            Loads a sample training block: ~10 weeks of push/pull/legs across three gyms,
            with templates, progression, RPE and personal records — so you can see every
            screen populated. Merges into existing history and is safe to load once;
            use “Reset all data” below to clear it.
          </p>
          <Button
            className="w-full"
            disabled={!storageAvailable}
            onClick={() => setDemoOpen(true)}
          >
            Load demo dataset
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold tracking-tight">Gyms</h2>
        <div className="space-y-2 rounded-[10px] border border-line bg-surface p-4">
          <p className="text-xs text-muted">
            Tag workouts to a gym and keep per-gym history and personal records. Weights are never shared between gyms — equipment differs.
          </p>
          {gyms.length === 0 ? (
            <p className="text-sm text-muted">No gyms added yet. Add one from the Home screen or here.</p>
          ) : (
            <ul className="space-y-1.5">
              {gyms.map((g) => {
                const usedBy = sessions.filter((s) => s.gymId === g.id).length;
                return (
                  <li key={g.id} className="flex items-center gap-2 rounded-[8px] border border-line bg-raised px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="text-[11px] text-muted">
                        {usedBy} {usedBy === 1 ? 'workout' : 'workouts'}
                        {settings.selectedGymId === g.id && ' · selected on Home'}
                      </p>
                    </div>
                    <Button onClick={() => setGymEdit({ id: g.id, name: g.name })}>Rename</Button>
                    <Button
                      variant="danger"
                      onClick={() => setGymDelete({ id: g.id, name: g.name, usedBy })}
                    >
                      Delete
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <AddGymRow onCreate={(name) => store.createGym(name).then(() => toast('Gym added', 'success'))} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold tracking-tight">Your data</h2>
        <div className="space-y-2 rounded-[10px] border border-line bg-surface p-4">
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
        <h2 className="text-[13px] font-semibold tracking-tight">Where is my data?</h2>
        <div className="space-y-2 rounded-[10px] border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
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

      <Sheet
        open={gymEdit !== null}
        onClose={() => setGymEdit(null)}
        title="Rename gym"
        footer={
          <Button
            variant="primary"
            className="w-full"
            disabled={!gymEdit?.name.trim()}
            onClick={() => {
              if (gymEdit) {
                void store
                  .renameGym(gymEdit.id, gymEdit.name)
                  .then(() => toast('Gym renamed', 'success'))
                  .catch((e: Error) => toast(e.message, 'error'));
              }
              setGymEdit(null);
            }}
          >
            Save
          </Button>
        }
      >
        <input
          aria-label="Gym name"
          className="w-full rounded-[8px] border border-line bg-raised px-3 py-2.5 text-sm outline-none focus-visible:outline-accent"
          value={gymEdit?.name ?? ''}
          onChange={(e) => setGymEdit((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
        />
      </Sheet>

      <ConfirmSheet
        open={gymDelete !== null}
        onClose={() => setGymDelete(null)}
        title="Delete gym?"
        message={
          gymDelete
            ? `"${gymDelete.name}" will be removed from the selector.${
                gymDelete.usedBy > 0
                  ? ` ${gymDelete.usedBy} past ${gymDelete.usedBy === 1 ? 'workout' : 'workouts'} keep their gym tag for reference, shown as unnamed.`
                  : ''
              }`
            : ''
        }
        confirmLabel="Delete gym"
        danger
        onConfirm={() => {
          if (gymDelete) {
            void store.deleteGym(gymDelete.id).then(() => toast('Gym deleted', 'success'));
          }
        }}
      />

      <ConfirmSheet
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title="Load demo dataset?"
        message={
          sessions.length > 0
            ? `You have ${sessions.length} real workouts. The demo block (~35 sessions, 3 gyms, 3 templates) will merge into your history alongside them.`
            : 'Adds ~10 weeks of sample training across three gyms, with templates and progression.'
        }
        confirmLabel="Load demo data"
        pin="1205"
        onConfirm={() => {
          void store
            .loadDemoData()
            .then(() => toast('Demo data loaded', 'success'))
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

function AddGymRow({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [draft, setDraft] = useState('');
  const toast = useToast();
  return (
    <div className="flex gap-2 pt-1">
      <input
        aria-label="New gym name"
        className="min-w-0 flex-1 rounded-[8px] border border-line bg-raised px-3 py-2 text-sm outline-none focus-visible:outline-accent"
        placeholder="New gym name…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) {
            void onCreate(draft)
              .then(() => setDraft(''))
              .catch((err: Error) => toast(err.message, 'error'));
          }
        }}
      />
      <Button
        variant="primary"
        disabled={!draft.trim()}
        onClick={() =>
          void onCreate(draft)
            .then(() => setDraft(''))
            .catch((err: Error) => toast(err.message, 'error'))
        }
      >
        Add
      </Button>
    </div>
  );
}
