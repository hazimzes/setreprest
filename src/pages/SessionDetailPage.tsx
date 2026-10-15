import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { bestSet, estimateOneRepMax, formatDate, formatDuration, setVolume } from '../domain/calculations';
import { setTypeLabel } from '../domain/validation';
import { Button, ConfirmSheet, EmptyState } from '../components/ui';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useAppStore();
  const { sessions, exercises, settings, gyms } = store.state;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const session = sessions.find((s) => s.id === id);
  if (!session) {
    return (
      <EmptyState
        title="Workout not found"
        hint="It may have been deleted."
        action={<Link to="/history"><Button>Back to history</Button></Link>}
      />
    );
  }

  const nameOf = (exId: string) => exercises.find((e) => e.id === exId)?.name ?? 'Unknown exercise';

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <Link to="/history" className="text-xs text-muted hover:underline">← History</Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              {session.name}
              {gyms.find((g) => g.id === session.gymId) && ' '}
              {gyms.find((g) => g.id === session.gymId) && (
                <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted">
                  {gyms.find((g) => g.id === session.gymId)!.name}
                </span>
              )}
            </h1>
            <p className="tnum text-xs text-muted">
              {formatDate(session.startedAt)} · {formatDuration(session.accumulatedActiveMs)}
              {session.templateId ? ' · from template' : ''}
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete</Button>
        </div>
      </header>

      {session.exercises.map((slot) => {
        const volume = slot.sets.reduce((sum, s) => sum + setVolume(s), 0);
        const pr = bestSet(slot.sets);
        const e1rm = pr ? estimateOneRepMax(pr.set.weight, pr.set.reps) : null;
        return (
          <section key={slot.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate text-sm font-semibold">
                {nameOf(slot.exerciseId)}
                {slot.substitutedFromExerciseId && (
                  <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    subbed
                  </span>
                )}
              </h2>
              <p className="tnum shrink-0 text-xs text-muted">
                {Math.round(volume * 10) / 10} {settings.units}
                {e1rm !== null && ` · e1RM ${Math.round(e1rm * 10) / 10}`}
              </p>
            </div>
            <table className="tnum mt-2 w-full text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-1 font-medium">Set</th>
                  <th scope="col" className="py-1 font-medium">Type</th>
                  <th scope="col" className="py-1 text-right font-medium">Weight</th>
                  <th scope="col" className="py-1 text-right font-medium">Reps</th>
                  <th scope="col" className="py-1 text-right font-medium">RPE</th>
                </tr>
              </thead>
              <tbody>
                {slot.sets.map((set, i) => (
                  <tr key={set.id} className={set.completed ? '' : 'opacity-45'}>
                    <td className="py-1">{i + 1}</td>
                    <td className="py-1">{setTypeLabel(set.type)}</td>
                    <td className="py-1 text-right">{set.weight > 0 ? `${set.weight} ${settings.units}` : 'BW'}</td>
                    <td className="py-1 text-right">{set.reps}</td>
                    <td className="py-1 text-right">{set.rpe ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {slot.sets.some((s) => s.notes) && (
              <ul className="mt-2 space-y-0.5">
                {slot.sets.filter((s) => s.notes).map((s) => (
                  <li key={s.id} className="text-[11px] text-muted">“{s.notes}”</li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete workout?"
        message={`"${session.name}" and all its sets will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          void store.deleteSessionById(session.id);
          navigate('/history');
        }}
      />
    </div>
  );
}
