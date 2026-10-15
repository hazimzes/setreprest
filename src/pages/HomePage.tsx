import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import {
  countCompletedSets,
  formatDate,
  formatDuration,
  sessionElapsedMs,
  sessionVolume,
} from '../domain/calculations';
import { Button, ConfirmSheet, EmptyState, Skeleton } from '../components/ui';
import { GymTabs } from '../components/GymTabs';
import { ThisWeekCard } from '../components/ThisWeekCard';
import { useState } from 'react';

export function HomePage() {
  const store = useAppStore();
  const { status, activeSession, sessions, templates, exercises, settings, gyms } = store.state;
  const navigate = useNavigate();
  const [discardOpen, setDiscardOpen] = useState(false);

  const selectedGym = settings.selectedGymId ?? '';
  const gymName = (id: string | undefined) => gyms.find((g) => g.id === id)?.name;
  const visibleSessions = selectedGym
    ? sessions.filter((s) => s.gymId === selectedGym)
    : sessions;

  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const last = visibleSessions[0];
  const fourWeeksAgo = Date.now() - 28 * 24 * 3600 * 1000;
  const recent = visibleSessions.filter((s) => s.startedAt >= fourWeeksAgo);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <ThisWeekCard sessions={visibleSessions} units={settings.units} />
      </div>

      <div className="col-span-2">
      <GymTabs
        gyms={gyms}
        selected={selectedGym}
        storageAvailable={store.state.storageAvailable}
        onSelect={(id) => store.selectGym(id)}
        onCreate={(name) => store.createGym(name).then(() => undefined)}
      />
      </div>

      {activeSession ? (
        <section className="col-span-2 rounded-[10px] border border-line bg-surface p-4">
          <p className="microlabel text-accent">Workout in progress</p>
          <h2 className="mt-1 truncate text-[15px] font-semibold tracking-tight">{activeSession.name}</h2>
          <p className="tnum mt-1 text-[13px] text-secondary">
            {formatDuration(sessionElapsedMs(activeSession, Date.now()))} ·{' '}
            {countCompletedSets(activeSession)} sets ·{' '}
            {Math.round(sessionVolume(activeSession) * 10) / 10} {settings.units}
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="flex-1" onClick={() => navigate('/workout')}>
              Continue workout
            </Button>
            <Button variant="danger" onClick={() => setDiscardOpen(true)}>Discard</Button>
          </div>
        </section>
      ) : (
        <>
          <Button
            variant="primary"
            className="col-span-2 h-12 w-full text-sm"
            onClick={() =>
              void store
                .startSession({ gymId: selectedGym || undefined })
                .then(() => navigate('/workout'))
            }
            disabled={!store.state.storageAvailable}
          >
            {selectedGym ? `Start workout at ${gymName(selectedGym)}` : 'Start empty workout'}
          </Button>
          {templates.length > 0 && (
            <section className="col-span-2 rounded-[10px] border border-line bg-surface p-4">
              <p className="microlabel">Start from template</p>
              <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto pb-1">
                {templates.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    className="shrink-0 rounded-[8px] border border-line bg-raised px-3 py-2 text-[13px] font-medium hover:bg-hover disabled:opacity-50"
                    disabled={!store.state.storageAvailable}
                    onClick={() =>
                      void store
                        .startSession({ templateId: t.id, gymId: selectedGym || undefined })
                        .then(() => navigate('/workout'))
                    }
                  >
                    {t.name}
                    <span className="ml-1.5 text-[11px] text-muted">{t.exercises.length} ex</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!store.state.storageAvailable && (
        <p className="col-span-2 rounded-[10px] border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          Storage unavailable — starting workouts is disabled. See Settings for details.
        </p>
      )}

      {exercises.length === 0 && (
        <p className="col-span-2 rounded-[10px] border border-line bg-surface px-4 py-3 text-xs text-muted">
          Exercise library is empty. Pull-to-refresh won't fix it — restore a backup in Settings or create custom exercises in the Library.
        </p>
      )}

      <section className="col-span-2 space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold tracking-tight">Last workout</h3>
          <Link to="/history" className="text-xs text-muted underline-offset-2 hover:underline">
            All history
          </Link>
        </div>
        {last ? (
          <Link
            to={`/history/${last.id}`}
            className="block rounded-[10px] border border-line bg-surface p-4 hover:bg-raised"
          >
            <p className="text-sm font-medium">
              {last.name}
              {gymName(last.gymId) && (
                <span className="ml-2 rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  {gymName(last.gymId)}
                </span>
              )}
            </p>
            <p className="tnum mt-1 text-xs text-muted">
              {formatDate(last.startedAt)} · {formatDuration(
                last.accumulatedActiveMs
              )} · {countCompletedSets(last)} sets · {Math.round(sessionVolume(last) * 10) / 10} {settings.units}
            </p>
          </Link>
        ) : selectedGym ? (
          <EmptyState
            title={`No workouts at ${gymName(selectedGym)} yet`}
            hint="Start a session here and it will be tracked for this gym."
          />
        ) : (
          <EmptyState title="No workouts yet" hint="Your first session will show up here." />
        )}
      </section>

      {recent.length > 0 && (
        <section className="col-span-2 space-y-2 rounded-[10px] border border-line bg-surface p-4">
          <h3 className="text-[13px] font-semibold tracking-tight">
            Last 4 weeks{selectedGym ? ` — ${gymName(selectedGym)}` : ''}
          </h3>
          <div className="flex items-end gap-1.5" aria-label={`${recent.length} workouts in the last 4 weeks`}>
            {recent.slice(0, 14).reverse().map((s) => {
              const vol = sessionVolume(s);
              const maxVol = Math.max(...recent.map(sessionVolume), 1);
              return (
                <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-accent/80"
                    style={{ height: `${Math.max(8, Math.round((vol / maxVol) * 48))}px` }}
                    title={`${s.name}: ${Math.round(vol)} ${settings.units}`}
                  />
                  <span className="text-[9px] text-muted">{new Date(s.startedAt).getDate()}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            {recent.length} sessions · {Math.round(recent.reduce((sum, s) => sum + sessionVolume(s), 0))} {settings.units} total volume
          </p>
        </section>
      )}

      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard workout?"
        message="All sets logged in this session will be permanently deleted. Completed history is not affected."
        confirmLabel="Discard"
        danger
        onConfirm={() => {
          void store.discardSession();
        }}
      />
    </div>
  );
}
