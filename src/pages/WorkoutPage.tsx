import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { countCompletedSets, formatDuration, sessionElapsedMs, sessionVolume } from '../domain/calculations';
import { Button, ConfirmSheet, EmptyState, PlusIcon, Sheet } from '../components/ui';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';
import { RestTimer } from '../components/workout/RestTimer';

function useElapsed(enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [enabled]);
}

export function WorkoutPage() {
  const store = useAppStore();
  const { activeSession, settings, exercises, gyms } = store.state;
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [substituteFor, setSubstituteFor] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);

  const running = activeSession !== null && !activeSession.paused;
  // useElapsed re-renders every second while running; elapsed must be computed
  // on every render (not memoized on activeSession) or the clock freezes.
  useElapsed(running);

  const elapsed = activeSession ? sessionElapsedMs(activeSession, Date.now()) : 0;

  if (!activeSession) {
    return (
      <EmptyState
        title="No workout in progress"
        hint="Start one from the home screen."
        action={
          <Link to="/">
            <Button variant="primary">Go home</Button>
          </Link>
        }
      />
    );
  }

  const exerciseById = (id: string) => exercises.find((e) => e.id === id);

  const completeSetFlow = async (slotId: string, setId: string) => {
    const slot = activeSession.exercises.find((ex) => ex.id === slotId);
    const set = slot?.sets.find((s) => s.id === setId);
    await store.toggleSetComplete(slotId, setId);
    if (set && !set.completed && settings.restTimerEnabled && restRemaining === null) {
      setRestTotal(settings.defaultRestSec);
      setRestRemaining(settings.defaultRestSec);
    }
  };

  const finish = async () => {
    setRestRemaining(null);
    // Navigate before finishing: unmounting clears the page-level redirect
    // effect that would otherwise race this navigation back to Home.
    navigate('/history');
    await store.finishSession();
  };

  return (
    <div className="space-y-3">
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-bg/95 px-4 pb-2 pt-2 md:top-[45px]">
        <div className="flex items-center gap-2">
          <button
            className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold tracking-tight"
            onClick={() => { setDraftName(activeSession.name); setRenameOpen(true); }}
            aria-label={`Rename workout. Current name: ${activeSession.name}`}
          >
            {activeSession.name}
          </button>
          <span className="tnum rounded-[6px] border border-line bg-raised px-2 py-1 text-[13px]" aria-label={`Elapsed ${formatDuration(elapsed)}`}>
            {activeSession.paused && <span className="mr-1 text-[10px] uppercase tracking-wide text-muted">Paused</span>}
            {formatDuration(elapsed)}
          </span>
          {activeSession.paused ? (
            <Button variant="primary" onClick={() => store.resumeSession()}>Resume</Button>
          ) : (
            <Button onClick={() => store.pauseSession()}>Pause</Button>
          )}
        </div>
        <p className="tnum mt-1 pb-1 text-[11px] text-muted">
          {gyms.find((g) => g.id === activeSession.gymId) && (
            <span className="mr-2 rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium">
              {gyms.find((g) => g.id === activeSession.gymId)!.name}
            </span>
          )}
          {countCompletedSets(activeSession)} sets done · volume {Math.round(sessionVolume(activeSession) * 10) / 10} {settings.units}
        </p>
      </header>

      {activeSession.exercises.length === 0 ? (
        <EmptyState
          title="Empty workout"
          hint="Add exercises from your library, or start from a template next time."
          action={<Button variant="primary" onClick={() => setAddOpen(true)}>Add exercise</Button>}
        />
      ) : (
        activeSession.exercises.map((slot) => (
          <ExerciseCard
            key={slot.id}
            slot={slot}
            exercise={exerciseById(slot.exerciseId)}
            units={settings.units}
            onToggleSet={(setId) => void completeSetFlow(slot.id, setId)}
            onUpdateSet={(setId, patch) =>
              void store.updateSet(slot.id, setId, patch).catch((e) => alert(e.message))
            }
            onRemoveSet={(setId) => void store.removeSet(slot.id, setId)}
            onAddSet={() => void store.addSet(slot.id)}
            onRemove={() => void store.removeSessionExercise(slot.id)}
            onSubstitute={() => setSubstituteFor(slot.id)}
            onMove={(dir) => void store.reorderExercise(slot.id, dir)}
          />
        ))
      )}

      {activeSession.exercises.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
          <PlusIcon />
          Add exercise
        </Button>
      )}

      <div className="pt-2">
        <Button variant="primary" className="w-full" onClick={() => setFinishOpen(true)}>
          Finish workout
        </Button>
      </div>

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        exercises={exercises}
        excludeIds={activeSession.exercises.map((e) => e.exerciseId)}
        onPick={(id) => void store.addSessionExercise(id).catch((e) => alert(e.message))}
      />

      <AddExerciseSheet
        open={substituteFor !== null}
        onClose={() => setSubstituteFor(null)}
        exercises={exercises}
        title="Substitute with…"
        onPick={(id) => {
          if (substituteFor) void store.substituteExercise(substituteFor, id);
          setSubstituteFor(null);
        }}
      />

      <Sheet
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename workout"
        footer={
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              void store.renameSession(draftName);
              setRenameOpen(false);
            }}
          >
            Save
          </Button>
        }
      >
        <input
          aria-label="Workout name"
          className="w-full rounded-[8px] border border-line bg-raised px-3 py-2.5 text-sm outline-none focus-visible:outline-accent"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
        />
      </Sheet>

      <ConfirmSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish workout?"
        confirmLabel="Finish"
        message={`${countCompletedSets(activeSession)} sets · ${formatDuration(elapsed)} · volume ${Math.round(sessionVolume(activeSession) * 10) / 10} ${settings.units}. The workout will be saved to history.`}
        onConfirm={() => void finish()}
      />

      {restRemaining !== null && (
        <RestTimer
          seconds={restRemaining}
          onDone={() => setRestRemaining(null)}
          onSkip={() => setRestRemaining(null)}
          onExtend={(extra) => {
            setRestTotal((t) => t + extra);
            setRestRemaining((r) => (r ?? 0) + extra);
          }}
          key={`${restTotal}`}
        />
      )}
    </div>
  );
}
