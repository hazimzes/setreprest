import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { Button, ConfirmSheet, EmptyState } from '../components/ui';
import { useToast } from '../components/ui';

export function TemplatesPage() {
  const store = useAppStore();
  const { templates, storageAvailable } = store.state;
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const nameOf = (id: string) => store.state.templates.find((t) => t.id === id)?.name ?? '';

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Templates</h1>
        <p className="text-xs text-muted">{templates.length}</p>
      </header>

      {templates.length === 0 ? (
        <EmptyState
          title="No templates"
          hint="Templates keep your routine ready — starting a session from one is a single tap."
          action={
            storageAvailable ? (
              <Button variant="primary" onClick={() => navigate('/templates/new')}>Create template</Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/templates/${t.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {t.exercises.length} exercises
                  </p>
                </Link>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    onClick={() => void store.startSession({ templateId: t.id }).then(() => navigate('/workout'))}
                    disabled={!storageAvailable}
                  >
                    Start
                  </Button>
                  <Button
                    aria-label={`Duplicate ${t.name}`}
                    onClick={() => void store.duplicateTemplate(t.id).then(() => toast('Template duplicated', 'success'))}
                  >
                    Copy
                  </Button>
                  <Button variant="danger" aria-label={`Delete ${t.name}`} onClick={() => setDeleteId(t.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {storageAvailable && (
        <Button variant="primary" className="w-full" onClick={() => navigate('/templates/new')}>
          + New template
        </Button>
      )}

      <ConfirmSheet
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete template?"
        message={`"${deleteId ? nameOf(deleteId) : ''}" will be removed. Workouts already logged are not affected.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) void store.deleteTemplate(deleteId);
        }}
      />
    </div>
  );
}
