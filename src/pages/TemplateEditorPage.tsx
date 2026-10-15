import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import type { TemplateExercise } from '../domain/models';
import { Button, EmptyState, NumberField, PlusIcon, useToast } from '../components/ui';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const store = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();
  const { templates, exercises } = store.state;

  const existing = id && id !== 'new' ? templates.find((t) => t.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [items, setItems] = useState<TemplateExercise[]>(existing?.exercises ?? []);
  const [addOpen, setAddOpen] = useState(false);

  const nameOf = (exId: string) => exercises.find((e) => e.id === exId)?.name ?? 'Unknown';
  const isNew = !existing;
  const valid = name.trim().length > 0 && items.length > 0;

  const move = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      if (tmp === undefined || next[target] === undefined) return prev;
      next[index] = next[target];
      next[target] = tmp;
      return next.map((it, i) => ({ ...it, order: i }));
    });
  };

  const save = async () => {
    try {
      await store.saveTemplate({
        ...(existing ? { id: existing.id } : {}),
        name,
        exercises: items.map((it, i) => ({ ...it, order: i })),
      });
      toast('Template saved', 'success');
      navigate('/templates');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save template', 'error');
    }
  };

  const exerciseIds = useMemo(() => items.map((it) => it.exerciseId), [items]);

  if (!isNew && !existing) {
    return (
      <EmptyState
        title="Template not found"
        action={
          <Link to="/templates">
            <Button>Back to templates</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Link to="/templates" className="text-xs text-muted hover:underline">
          ← Templates
        </Link>
        <h1 className="text-[15px] font-semibold tracking-tight">{isNew ? 'New template' : 'Edit template'}</h1>
      </header>

      <div>
        <label htmlFor="tpl-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          Name
        </label>
        <input
          id="tpl-name"
          className="h-9 w-full rounded-[8px] border border-line bg-surface px-3 text-[13px] outline-none focus:border-line-strong"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push day A"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No exercises" hint="Add the first exercise to this template." />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={`${item.exerciseId}-${i}`} className="rounded-[10px] border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{nameOf(item.exerciseId)}</p>
                <button
                  aria-label="Move up"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-fg disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label="Move down"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-fg disabled:opacity-30"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  aria-label={`Remove ${nameOf(item.exerciseId)}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-danger/30 text-danger hover:bg-danger/10"
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i).map((it, j) => ({ ...it, order: j })))}
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <NumberField
                  label={`Target sets for ${nameOf(item.exerciseId)}`}
                  value={item.targetSets}
                  onChange={(v) =>
                    setItems((prev) =>
                      prev.map((it, j) => (j === i ? { ...it, targetSets: Math.max(1, Math.round(v)) } : it))
                    )
                  }
                  min={1}
                  max={20}
                  suffix="sets"
                  className="flex-1"
                />
                <NumberField
                  label={`Target reps for ${nameOf(item.exerciseId)}`}
                  value={item.targetReps ?? 0}
                  onChange={(v) =>
                    setItems((prev) =>
                      prev.map((it, j) =>
                        j === i ? { ...it, targetReps: Math.round(v) > 0 ? Math.round(v) : undefined } : it
                      )
                    )
                  }
                  min={0}
                  max={100}
                  suffix="reps"
                  className="flex-1"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
        <PlusIcon />
        Add exercise
      </Button>

      <Button variant="primary" className="w-full" disabled={!valid} onClick={() => void save()}>
        Save template
      </Button>

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        exercises={exercises}
        excludeIds={exerciseIds}
        onPick={(exerciseId) =>
          setItems((prev) => [
            ...prev,
            { exerciseId, order: prev.length, targetSets: 3 },
          ])
        }
      />
    </div>
  );
}
