import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { Button, ConfirmSheet, EmptyState, PlusIcon } from '../components/ui';
import { useToast } from '../components/ui';

export function TemplatesPage() {
  const store = useAppStore();
  const { templates, storageAvailable } = store.state;
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const nameOf = (id: string) => store.state.templates.find((t) => t.id === id)?.name ?? '';

  return (
    <div className="grid grid-cols-2 gap-2">
      <header className="col-span-2 flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight">Templates</h1>
        <p className="text-xs text-muted">{templates.length}</p>
      </header>

      {templates.length === 0 ? (
        <div className="col-span-2"><EmptyState
          title="No templates"
          hint="Templates keep your routine ready — starting a session from one is a single tap."
          action={
            storageAvailable ? (
              <Button variant="primary" onClick={() => navigate('/templates/new')}>Create template</Button>
            ) : undefined
          }
        />
        </div>
      ) : (
        <ul className="col-span-2 grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-col rounded-[10px] border border-line bg-surface p-3.5">
              <Link to={`/templates/${t.id}`} className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold tracking-tight">{t.name}</p>
                <p className="tnum mt-0.5 text-[11px] text-muted">{t.exercises.length} exercises</p>
              </Link>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <Button
                  variant="primary"
                  className="px-0 text-xs"
                  onClick={() => void store.startSession({ templateId: t.id }).then(() => navigate('/workout'))}
                  disabled={!storageAvailable}
                >
                  Start
                </Button>
                <Button
                  className="px-0 text-xs"
                  aria-label={`Duplicate ${t.name}`}
                  onClick={() => void store.duplicateTemplate(t.id).then(() => toast('Template duplicated', 'success'))}
                >
                  Copy
                </Button>
                <Button
                  variant="danger"
                  className="px-0 text-xs"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => setDeleteId(t.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {storageAvailable && (
        <Button variant="primary" className="col-span-2 w-full" onClick={() => navigate('/templates/new')}>
          <PlusIcon />
          New template
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
